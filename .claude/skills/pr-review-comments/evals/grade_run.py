#!/usr/bin/env python3
"""Programmatic grading for a pr-review-comments eval run.

usage: grade_run.py <run_dir> <pr_number> <checkout_dir> <head_before_sha> <started_at_iso> <author_login>

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
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meta = json.load(open(os.path.join(os.path.dirname(run_dir.rstrip("/")), "eval_metadata.json")))


def sh(cmd, cwd=checkout, check=True):
    p = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if check and p.returncode != 0:
        raise RuntimeError(f"{cmd}\n{p.stderr}")
    return p.stdout.strip(), p.returncode


data = json.loads(sh(f"python3 {SKILL}/scripts/pr_comments.py fetch {pr}")[0])
head_ref = data["pr"]["head_ref"]
sh("git fetch origin --quiet")
head_now = sh(f"git rev-parse origin/{head_ref}")[0]

# Threads that were open at run start = those with a root comment before `started`
# and not resolved before (we can't see resolution time, so: threads with root before start).
threads = [t for t in data["threads"] if t["comments"][0]["created_at"] < started]
new_replies = {
    t["root_comment_id"]: [c for c in t["comments"] if c["author"] == author and c["created_at"] >= started]
    for t in threads
}

# New commits on the head branch since `before`
log = sh(f"git log --format='%H%x1f%B%x1e' {before}..{head_now}")[0]
commits = []
for chunk in log.split("\x1e"):
    if not chunk.strip():
        continue
    sha, body = chunk.strip("\n").split("\x1f", 1)
    urls = re.findall(r"discussion_r(\d+)", body)
    commits.append({"sha": sha, "body": body, "thread_ids": [int(u) for u in urls],
                    "coauthor": "Co-Authored-By: Claude" in body})

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
            ok = any(sh(f"git merge-base --is-ancestor {s} {head_now}", check=False)[1] == 0 for s in shas)
            if not ok:
                sha_missing.append(f"r{t['root_comment_id']}: {shas}")
add("fixed_threads_resolved_declined_threads_open", len(bad_state) == 0, str(bad_state) or "all consistent")
add("fix_replies_cite_a_pushed_sha", len(sha_missing) == 0, str(sha_missing) or "all fix replies cite a SHA on the head branch")

# preamble check (cheap heuristic; confirm by reading)
pre = [f"r{t['root_comment_id']}" for t in threads for c in new_replies[t["root_comment_id"]]
       if re.match(r"\s*(thanks|thank you|good catch|great point|you're right|agreed)", c["body"], re.I)]
add("replies_have_no_preamble", len(pre) == 0, f"replies opening with filler: {pre}" if pre else "none open with filler")

# checks at pushed head (the checkout is expected to be on the head branch)
cur = sh("git rev-parse HEAD")[0]
status = sh("git status --porcelain --untracked-files=no")[0]
add("working_tree_clean_and_on_pr_branch", cur == head_now and status == "",
    f"HEAD={cur[:8]} origin/{head_ref}={head_now[:8]} dirty={bool(status)}")
checks = {}
changed = sh(f"git diff --name-only {before}..{head_now} -- '*.ts' '*.tsx' '*.js' '*.mjs'")[0].split()
lint_cmd = "npx eslint " + " ".join(changed) if changed else "true"   # lint only what the run touched: the repo may carry pre-existing lint errors
for name, cmd in [("lint(changed files)", lint_cmd), ("tsc", "npx tsc --noEmit"), ("unit", "npx vitest run --project unit")]:
    out, rc = sh(cmd, check=False)
    checks[name] = rc
add("checks_pass_at_pushed_head", all(rc == 0 for rc in checks.values()), f"exit codes: {checks}")

# report
report_path = os.path.join(run_dir, "outputs", "report.md")
report = open(report_path).read() if os.path.exists(report_path) else ""
missing_in_report = [t["path"] for t in threads if os.path.basename(t["path"]) not in report]
add("report_has_per_thread_table", bool(report) and not missing_in_report,
    f"report exists={bool(report)}; threads not mentioned: {missing_in_report}")

# judgement-based assertions: leave for the reader
for a in meta["assertions"]:
    name = a.split(":")[0]
    if name not in {e["text"] for e in exp}:
        add(name, None, "needs reading — see printed replies/triage")

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
