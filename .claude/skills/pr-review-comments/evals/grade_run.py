#!/usr/bin/env python3
"""Programmatic grading for a pr-review-comments eval run.

usage: grade_run.py <run_dir> <pr_number> <checkout_dir> <head_before_sha> <started_at_iso> <author_login> [baseline_json]

`baseline_json` is a `pr_comments.py fetch <pr>` dump taken BEFORE the agent ran; it is the
authoritative list of which threads were unresolved (and waiting on the author) at run start.
Without it the grader falls back to inferring that from the final state, which cannot see a
thread the run resolved without replying to — the harness should always capture one.

Writes <run_dir>/grading.json with expectations [{text, passed, evidence}] for the assertions that
can be checked mechanically, and prints the replies / report so the judgement-based ones can be
graded by reading. Assertions it can't decide are emitted with passed=null for a human/LLM pass.
"""
import json
import os
import re
import subprocess
import sys

run_dir, pr, checkout, before, started, author = sys.argv[1:7]
baseline_path = sys.argv[7] if len(sys.argv) > 7 else None
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meta = json.load(open(os.path.join(os.path.dirname(run_dir.rstrip("/")), "eval_metadata.json")))


def sh(argv, cwd=checkout, check=True, raw=False):
    # argv list, no shell: branch names and paths come from the PR under test.
    p = subprocess.run(argv, cwd=cwd, capture_output=True, text=True)
    if check and p.returncode != 0:
        raise RuntimeError(f"{' '.join(argv)}\n{p.stderr}")
    # raw=True keeps stdout exactly as printed — needed for NUL-delimited output, where
    # stripping could eat leading/trailing whitespace that is part of the first/last path.
    return (p.stdout if raw else p.stdout.strip()), p.returncode


data = json.loads(sh(["python3", os.path.join(SKILL, "scripts", "pr_comments.py"), "fetch", pr])[0])
head_ref = data["pr"]["head_ref"]
# The PR's head commit comes from the API and is fetched via refs/pull/<n>/head, which
# exists for fork PRs too (origin/<head_ref> would not) — head_ref itself is only used
# below to confirm the checkout is actually on the PR's branch, not just at its commit.
head_now = data["pr"]["head_sha"]
sh(["git", "fetch", "origin", "--quiet", f"refs/pull/{pr}/head"])
sh(["git", "cat-file", "-e", f"{head_now}^{{commit}}"])

# Threads the run was expected to answer: unresolved at run start with the ball in the
# author's court (last comment not the author's — SKILL.md Step 1 skips threads waiting on
# the reviewer). With a baseline that is read directly from the pre-run snapshot.
def author_replies(t):
    return [c for c in t["comments"] if c["author"] == author and c["created_at"] >= started]


if baseline_path:
    baseline = {t["thread_id"]: t for t in json.load(open(baseline_path))["threads"]}

    def in_scope(t):
        b = baseline.get(t["thread_id"])
        return bool(b) and not b["is_resolved"] and b["comments"][-1]["author"] != author
else:
    # Fallback: GitHub exposes no resolution timestamp, so a thread that is resolved now
    # and has no author activity since `started` is assumed resolved before the run. This
    # cannot tell that apart from a thread the run resolved silently — pass a baseline.
    print("WARNING: no baseline snapshot; inferring run-start thread state from the final state",
          file=sys.stderr)

    def in_scope(t):
        before_start = [c for c in t["comments"] if c["created_at"] < started]
        if not before_start or before_start[-1]["author"] == author:
            return False
        return not (t["is_resolved"] and not author_replies(t))


threads = [t for t in data["threads"] if in_scope(t)]
new_replies = {t["root_comment_id"]: author_replies(t) for t in threads}

# New commits on the head branch since `before`
log = sh(["git", "log", "--format=%H%x1f%B%x1e", f"{before}..{head_now}"])[0]
commits = []
for chunk in log.split("\x1e"):
    if not chunk.strip():
        continue
    sha, body = chunk.strip("\n").split("\x1f", 1)
    urls = re.findall(r"discussion_r(\d+)", body)
    last_line = body.rstrip().splitlines()[-1] if body.strip() else ""
    commits.append({"sha": sha, "body": body, "thread_ids": [int(u) for u in urls],
                    "coauthor": last_line.startswith("Co-Authored-By: Claude")})

exp = []


def add(text, passed, evidence):
    exp.append({"text": text, "passed": passed, "evidence": evidence})


# every_open_thread_got_exactly_one_new_reply / no_thread_left_without_reply
counts = {rid: len(v) for rid, v in new_replies.items()}
add("every_open_thread_got_exactly_one_new_reply", all(c == 1 for c in counts.values()),
    f"reply counts by root comment id: {counts}")
add("no_thread_left_without_reply", all(c >= 1 for c in counts.values()),
    f"threads without reply: {[r for r, c in counts.items() if c == 0]}")

# one_commit_per_addressed_thread
multi = [c["sha"][:8] for c in commits if len(c["thread_ids"]) != 1]
add("one_commit_per_addressed_thread", len(multi) == 0 or None,
    f"{len(commits)} new commits; commits not linking exactly one thread: {multi} (check report for declared shared commits)")
add("commits_have_coauthor_trailer", all(c["coauthor"] for c in commits) if commits else True,
    f"missing trailer: {[c['sha'][:8] for c in commits if not c['coauthor']]}")

# fixed vs declined resolution state — matched against SKILL.md's own verdict vocabulary
# (fix / fix-differently / decline / out-of-scope / already-addressed), hyphen or space,
# with decline checked first so an accidental "addressed in" inside a decline reply (e.g.
# "not addressed in this PR; follow-up") can't be misread as a fix.
DECLINE_RE = re.compile(
    r"\b(not changing|leaving (this|it) as[- ]is|keeping (this|it) as[- ]is|declin\w*|out[- ]of[- ]scope)\b"
    # "follow-up" alone is a false-positive magnet (a paginated "follow-up query" is not
    # a decline) — only count it in the out-of-scope phrasing the skill itself uses. Same
    # for bare "keeping" (matches "keeping the schema validation..." in a fix reply) —
    # require the "as is" phrase the skill's own decline wording actually uses.
    r"|\b(as|in) an? follow[- ]up\b|\bfollow[- ]up (pr|issue|ticket)\b|\bopen(ed)? a follow[- ]up\b",
    re.I,
)
ALREADY_RE = re.compile(r"\balready[- ](addressed|handled)\b", re.I)
FIXED_RE = re.compile(r"\b(fixed|addressed|handled) (in|by)\b", re.I)
bad_state, sha_missing, reply_dump = [], [], []
for t in threads:
    for c in new_replies[t["root_comment_id"]]:
        body = c["body"]
        is_decl = bool(DECLINE_RE.search(body))
        is_already = bool(ALREADY_RE.search(body)) and not is_decl
        # A "new fix" (this round changed code) needs a pushed SHA; "already-addressed"
        # (pointing at existing code or an earlier commit) does not.
        is_new_fix = bool(FIXED_RE.search(body)) and not is_decl and not is_already
        is_fix = is_already or is_new_fix
        reply_dump.append(f"--- {t['path']}:{t['line']} r{t['root_comment_id']} resolved={t['is_resolved']} ---\n{body}\n")
        if is_fix and not t["is_resolved"]:
            bad_state.append(f"r{t['root_comment_id']} fixed but open")
        if is_decl and t["is_resolved"]:
            bad_state.append(f"r{t['root_comment_id']} declined but resolved")
        if is_new_fix:
            shas = re.findall(r"\b[0-9a-f]{7,40}\b", body)
            ok = any(sh(["git", "merge-base", "--is-ancestor", s, head_now], check=False)[1] == 0 for s in shas)
            if not ok:
                sha_missing.append(f"r{t['root_comment_id']}: {shas}")
add("fixed_threads_resolved_declined_threads_open", len(bad_state) == 0, str(bad_state) or "all consistent")
add("fix_replies_cite_a_pushed_sha", len(sha_missing) == 0, str(sha_missing) or "all fix replies cite a SHA on the head branch")

# preamble check (cheap heuristic; confirm by reading)
pre = [f"r{t['root_comment_id']}" for t in threads for c in new_replies[t["root_comment_id"]]
       if re.match(r"\s*(thanks|thank you|good catch|great point|you're right|agreed)", c["body"], re.I)]
add("replies_have_no_preamble", len(pre) == 0, f"replies opening with filler: {pre}" if pre else "none open with filler")

# checks at pushed head (the checkout is expected to be on the head branch, not just at
# its commit — a detached HEAD or another local branch pointing at the same commit would
# satisfy `cur == head_now` alone)
cur = sh(["git", "rev-parse", "HEAD"])[0]
cur_branch = sh(["git", "branch", "--show-current"])[0]
status = sh(["git", "status", "--porcelain"])[0]   # untracked files count: the run must not leave stray files behind
add("working_tree_clean_and_on_pr_branch",
    cur == head_now and cur_branch == head_ref and status == "",
    f"HEAD={cur[:8]} branch={cur_branch!r} (want {head_ref!r}) PR head={head_now[:8]} dirty={bool(status)}")
checks = {}
changed_raw = sh(["git", "diff", "--name-only", "-z", "--diff-filter=d", f"{before}..{head_now}", "--",
                  "*.ts", "*.tsx", "*.js", "*.mjs"], raw=True)[0]
changed = [f for f in changed_raw.rstrip("\0").split("\0") if f]
# `--` stops option parsing so a changed path starting with `-` can't be read as a flag.
# Lint only what the run touched — the repo may carry pre-existing lint errors elsewhere.
lint_cmd = ["npx", "eslint", "--", *changed] if changed else ["true"]
check_cmds = [("lint(changed files)", lint_cmd), ("tsc", ["npx", "tsc", "--noEmit"])]
# Run every vitest project the head branch actually defines (`storybook` always,
# `unit` only on branches that add src/lib tests) rather than hardcoding one name —
# SKILL.md requires "the relevant tests", and skipping `storybook` here let a broken
# story pass unnoticed.
vitest_config = os.path.join(checkout, "vitest.config.ts")
if os.path.exists(vitest_config):
    for name in re.findall(r"name:\s*['\"]([\w-]+)['\"]", open(vitest_config).read()):
        check_cmds.append((f"vitest:{name}", ["npx", "vitest", "run", "--project", name]))
for name, cmd in check_cmds:
    out, rc = sh(cmd, check=False)
    checks[name] = rc
add("checks_pass_at_pushed_head", all(rc == 0 for rc in checks.values()), f"exit codes: {checks}")

# report
report_path = os.path.join(run_dir, "outputs", "report.md")
report = open(report_path).read() if os.path.exists(report_path) else ""


VERDICT_RE = re.compile(r"\b(fix-differently|already-addressed|out-of-scope|declined?|fixed|fix)\b", re.I)
SHA_RE = re.compile(r"\b[0-9a-f]{7,40}\b")
report_lines = report.splitlines()


# A short `basename:line` mention is only safe to accept when no two graded threads
# collide on it — that collision (src/a/index.ts:10 vs src/b/index.ts:10) is exactly
# what let one mention satisfy two threads before.
basename_counts = {}
for t in threads:
    for n in (t["line"], t["original_line"]):
        if n:
            basename_counts[f"{os.path.basename(t['path'])}:{n}"] = basename_counts.get(f"{os.path.basename(t['path'])}:{n}", 0) + 1


def row_for(t):
    # A thread's row is identified by full path:line (current or original), an unambiguous
    # basename:line, or its root comment id; the row itself (a small window around the
    # match, since the report may wrap a thread over more than one line) must also carry a
    # verdict word and, for a fix/fix-differently/already-addressed row, a SHA or reason.
    keys = [f"{t['path']}:{n}" for n in (t["line"], t["original_line"]) if n]
    keys += [f"{os.path.basename(t['path'])}:{n}" for n in (t["line"], t["original_line"])
             if n and basename_counts[f"{os.path.basename(t['path'])}:{n}"] == 1]
    keys += [f"r{t['root_comment_id']}"]
    for i, line in enumerate(report_lines):
        if any(k in line for k in keys):
            return "\n".join(report_lines[i:i + 3])
    return None


rows = {t["root_comment_id"]: row_for(t) for t in threads}
missing_in_report = [f"{t['path']}:{t['line'] or t['original_line']}" for t in threads if rows[t["root_comment_id"]] is None]
no_verdict = [f"r{rid}" for rid, row in rows.items() if row and not VERDICT_RE.search(row)]
no_sha_or_reason = [
    f"r{rid}" for rid, row in rows.items()
    if row and VERDICT_RE.search(row) and not SHA_RE.search(row) and len(row.strip()) < 40
]
add("report_has_per_thread_table",
    bool(report) and not missing_in_report and not no_verdict and not no_sha_or_reason,
    f"report exists={bool(report)}; threads without an identifiable row: {missing_in_report}; "
    f"rows without a verdict word: {no_verdict}; rows with a verdict but no SHA and too short "
    f"to be a reason: {no_sha_or_reason}")

# judgement-based assertions: leave for the reader
for a in meta["assertions"]:
    name = a.split(":")[0]
    if name not in {e["text"] for e in exp}:
        add(name, None, "needs reading — see printed replies/report")

json.dump({"expectations": exp}, open(os.path.join(run_dir, "grading.json"), "w"), indent=2)
print(json.dumps({"pr": pr, "head_before": before[:8], "head_now": head_now[:8], "new_commits": len(commits)}, indent=2))
print("\n=== COMMITS ===")
for c in commits:
    print(f"{c['sha'][:8]} threads={c['thread_ids']}\n{c['body'].splitlines()[0]}\n")
print("=== REPLIES ===")
print("\n".join(reply_dump))
print("=== GRADING ===")
for e in exp:
    print(f"[{'PASS' if e['passed'] else 'FAIL' if e['passed'] is False else '????'}] {e['text']} — {e['evidence']}")
