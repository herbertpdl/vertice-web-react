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
# The PR's head commit comes from the API and is fetched via refs/pull/<n>/head, which
# exists for fork PRs too (origin/<head_ref> would not).
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

# fixed vs declined resolution state
fixed_pat = re.compile(r"\b(fixed|addressed|already handled|handled) (in|by)\b|\bfixed in\b", re.I)
decline_pat = re.compile(r"\b(not changing|leaving (this|it) as is|declin|out of scope|follow-up|keeping)\b", re.I)
bad_state, sha_missing, reply_dump = [], [], []
for t in threads:
    for c in new_replies[t["root_comment_id"]]:
        body = c["body"]
        is_fix = bool(fixed_pat.search(body))
        is_decl = bool(decline_pat.search(body)) and not is_fix
        reply_dump.append(f"--- {t['path']}:{t['line']} r{t['root_comment_id']} resolved={t['is_resolved']} ---\n{body}\n")
        if is_fix and not t["is_resolved"]:
            bad_state.append(f"r{t['root_comment_id']} fixed but open")
        if is_decl and t["is_resolved"]:
            bad_state.append(f"r{t['root_comment_id']} declined but resolved")
        if is_fix:
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

# checks at pushed head (the checkout is expected to be on the head branch)
cur = sh(["git", "rev-parse", "HEAD"])[0]
status = sh(["git", "status", "--porcelain"])[0]   # untracked files count: the run must not leave stray files behind
add("working_tree_clean_and_on_pr_branch", cur == head_now and status == "",
    f"HEAD={cur[:8]} PR head={head_now[:8]} dirty={bool(status)}")
checks = {}
changed_raw = sh(["git", "diff", "--name-only", "-z", "--diff-filter=d", f"{before}..{head_now}", "--",
                  "*.ts", "*.tsx", "*.js", "*.mjs"], raw=True)[0]
changed = [f for f in changed_raw.rstrip("\0").split("\0") if f]
lint_cmd = ["npx", "eslint", *changed] if changed else ["true"]   # lint only what the run touched: the repo may carry pre-existing lint errors
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


def mentioned(t):
    # A thread is identified by path:line (either the current or the original line) or by
    # its root comment id, so one mention can't cover two threads in the same file.
    base = os.path.basename(t["path"])
    keys = [f"{base}:{n}" for n in (t["line"], t["original_line"]) if n] + [f"r{t['root_comment_id']}"]
    return any(k in report for k in keys)


missing_in_report = [f"{t['path']}:{t['line'] or t['original_line']}" for t in threads if not mentioned(t)]
verdicts = re.findall(r"\b(fix-differently|fix|decline[d]?|out-of-scope|already-addressed)\b", report, re.I)
add("report_has_per_thread_table", bool(report) and not missing_in_report and len(verdicts) >= len(threads),
    f"report exists={bool(report)}; threads not mentioned by path:line or r<id>: {missing_in_report}; "
    f"{len(verdicts)} verdict words for {len(threads)} threads (SHA/reason per row: confirm by reading)")

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
