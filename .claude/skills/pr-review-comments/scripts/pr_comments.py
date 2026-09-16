#!/usr/bin/env python3
"""Thin wrapper over `gh` for working with pull-request review threads.

Subcommands:
  fetch   [PR]                       -> JSON with the PR, every review thread (resolved state,
                                        node id, all comments, diff hunk), review bodies and
                                        top-level comments. PR defaults to the current branch's PR.
  summary [PR]                       -> human-readable list of the OPEN threads (for a quick look).
  reply   PR COMMENT_ID (--body TEXT | --body-file FILE)
                                     -> reply inside the thread that COMMENT_ID belongs to.
                                        COMMENT_ID is the numeric databaseId of the thread's root
                                        comment (the `_r<digits>` part of its URL).
  resolve THREAD_NODE_ID             -> mark a review thread resolved (node id like PRRT_...).
  unresolve THREAD_NODE_ID           -> undo a resolve.
  comment PR (--body TEXT | --body-file FILE)
                                     -> top-level PR comment (for points that have no thread).
  request-review PR [--reviewer LOGIN]
                                     -> ask for a fresh review round. Defaults to GitHub Copilot
                                        (`copilot-pull-request-reviewer[bot]`); Copilot does not
                                        show up in requested_reviewers, it just starts reviewing,
                                        so success is the POST returning 201.

All calls go through `gh`, so the repo is inferred from the current directory's git remote.
Exit code is non-zero on any gh failure; the error text is passed through.
"""

import argparse
import json
import subprocess
import sys

THREADS_QUERY = """
query($owner:String!, $repo:String!, $pr:Int!, $cursor:String) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$pr) {
      number title state isDraft url
      headRefName baseRefName headRefOid
      author { login }
      reviewThreads(first:100, after:$cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id isResolved isOutdated path line startLine originalLine diffSide
          comments(first:100) {
            nodes { id databaseId author { login } body createdAt url outdated diffHunk }
          }
        }
      }
      reviews(first:100) {
        nodes { id databaseId author { login } state body submittedAt url }
      }
      comments(first:100) {
        nodes { id databaseId author { login } body createdAt url }
      }
    }
  }
}
"""

RESOLVE_MUTATION = """
mutation($id:ID!) { resolveReviewThread(input:{threadId:$id}) { thread { id isResolved } } }
"""
UNRESOLVE_MUTATION = """
mutation($id:ID!) { unresolveReviewThread(input:{threadId:$id}) { thread { id isResolved } } }
"""


def gh(*args, input_text=None):
    proc = subprocess.run(["gh", *args], capture_output=True, text=True, input=input_text)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        sys.exit(proc.returncode)
    return proc.stdout


def gh_json(*args):
    return json.loads(gh(*args))


def repo_owner_name():
    data = gh_json("repo", "view", "--json", "owner,name")
    return data["owner"]["login"], data["name"]


def resolve_pr_number(pr_arg):
    if pr_arg:
        # Accept "123", "#123" or a full PR URL.
        return int(str(pr_arg).rstrip("/").split("/")[-1].lstrip("#"))
    data = gh_json("pr", "view", "--json", "number")
    return int(data["number"])


def graphql(query, **variables):
    args = ["api", "graphql", "-f", f"query={query}"]
    for key, value in variables.items():
        flag = "-F" if isinstance(value, int) else "-f"
        args += [flag, f"{key}={value}"]
    return gh_json(*args)


def fetch(pr_arg):
    owner, repo = repo_owner_name()
    number = resolve_pr_number(pr_arg)
    threads = []
    cursor = None
    pr = None
    while True:
        variables = {"owner": owner, "repo": repo, "pr": number}
        if cursor:
            variables["cursor"] = cursor
        data = graphql(THREADS_QUERY, **variables)["data"]["repository"]["pullRequest"]
        if pr is None:
            pr = data
        page = data["reviewThreads"]
        threads.extend(page["nodes"])
        if not page["pageInfo"]["hasNextPage"]:
            break
        cursor = page["pageInfo"]["endCursor"]

    def flatten_thread(t):
        comments = t["comments"]["nodes"]
        root = comments[0] if comments else None
        return {
            "thread_id": t["id"],
            "is_resolved": t["isResolved"],
            "is_outdated": t["isOutdated"],
            "path": t["path"],
            "line": t["line"],
            "start_line": t["startLine"],
            "original_line": t["originalLine"],
            "diff_side": t["diffSide"],
            "root_comment_id": root["databaseId"] if root else None,
            "root_author": (root["author"] or {}).get("login") if root else None,
            "url": root["url"] if root else None,
            "diff_hunk": root["diffHunk"] if root else None,
            "comments": [
                {
                    "id": c["databaseId"],
                    "author": (c["author"] or {}).get("login"),
                    "created_at": c["createdAt"],
                    "body": c["body"],
                }
                for c in comments
            ],
        }

    result = {
        "repo": f"{owner}/{repo}",
        "pr": {
            "number": pr["number"],
            "title": pr["title"],
            "state": pr["state"],
            "is_draft": pr["isDraft"],
            "url": pr["url"],
            "author": (pr["author"] or {}).get("login"),
            "head_ref": pr["headRefName"],
            "base_ref": pr["baseRefName"],
            "head_sha": pr["headRefOid"],
        },
        "threads": [flatten_thread(t) for t in threads],
        "reviews": [
            {
                "id": r["databaseId"],
                "author": (r["author"] or {}).get("login"),
                "state": r["state"],
                "submitted_at": r["submittedAt"],
                "url": r["url"],
                "body": r["body"],
            }
            for r in pr["reviews"]["nodes"]
            if (r["body"] or "").strip()
        ],
        "issue_comments": [
            {
                "id": c["databaseId"],
                "author": (c["author"] or {}).get("login"),
                "created_at": c["createdAt"],
                "url": c["url"],
                "body": c["body"],
            }
            for c in pr["comments"]["nodes"]
        ],
    }
    return result


def summary(pr_arg):
    data = fetch(pr_arg)
    pr = data["pr"]
    print(f"PR #{pr['number']} {pr['title']}  [{pr['state']}]  {pr['head_ref']} -> {pr['base_ref']}")
    print(f"head: {pr['head_sha'][:10]}  author: {pr['author']}  {pr['url']}")
    open_threads = [t for t in data["threads"] if not t["is_resolved"]]
    resolved = len(data["threads"]) - len(open_threads)
    print(f"\n{len(open_threads)} open thread(s), {resolved} already resolved\n")
    for i, t in enumerate(open_threads, 1):
        flags = []
        if t["is_outdated"]:
            flags.append("OUTDATED")
        last = t["comments"][-1]
        if len(t["comments"]) > 1:
            flags.append(f"{len(t['comments'])} comments, last by {last['author']}")
        flag_text = f"  ({'; '.join(flags)})" if flags else ""
        print(f"{i}. {t['path']}:{t['line'] or t['original_line']}  root_comment_id={t['root_comment_id']}  thread_id={t['thread_id']}{flag_text}")
        print(f"   by {t['root_author']}: {t['comments'][0]['body'].strip().splitlines()[0][:160]}")
        print(f"   {t['url']}")
    if data["reviews"]:
        print("\nReview bodies (summaries, may contain points with no inline thread):")
        for r in data["reviews"]:
            first_line = r["body"].strip().splitlines()[0][:120]
            print(f"- {r['author']} {r['state']} {r['submitted_at']}: {first_line}")
    if data["issue_comments"]:
        print("\nTop-level comments:")
        for c in data["issue_comments"]:
            first_line = c["body"].strip().splitlines()[0][:120]
            print(f"- {c['author']} {c['created_at']}: {first_line}")


def read_body(args):
    if args.body_file:
        with open(args.body_file, encoding="utf-8") as f:
            return f.read()
    if args.body is None:
        sys.exit("error: provide --body or --body-file")
    return args.body


def reply(pr_arg, comment_id, body):
    owner, repo = repo_owner_name()
    number = resolve_pr_number(pr_arg)
    out = gh(
        "api", f"repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies",
        "-X", "POST", "-f", f"body={body}",
    )
    data = json.loads(out)
    print(data["html_url"])


def resolve(thread_id, undo=False):
    data = graphql(UNRESOLVE_MUTATION if undo else RESOLVE_MUTATION, id=thread_id)
    key = "unresolveReviewThread" if undo else "resolveReviewThread"
    print(json.dumps(data["data"][key]["thread"]))


def comment(pr_arg, body):
    number = resolve_pr_number(pr_arg)
    out = gh("pr", "comment", str(number), "--body", body)
    print(out.strip())


COPILOT_REVIEWER = "copilot-pull-request-reviewer[bot]"


def request_review(pr_arg, reviewer):
    owner, repo = repo_owner_name()
    number = resolve_pr_number(pr_arg)
    gh(
        "api", f"repos/{owner}/{repo}/pulls/{number}/requested_reviewers",
        "-X", "POST", "-f", f"reviewers[]={reviewer}",
    )
    print(f"review requested from {reviewer} on #{number}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("fetch"); p.add_argument("pr", nargs="?")
    p = sub.add_parser("summary"); p.add_argument("pr", nargs="?")
    p = sub.add_parser("reply"); p.add_argument("pr"); p.add_argument("comment_id")
    p.add_argument("--body"); p.add_argument("--body-file")
    p = sub.add_parser("resolve"); p.add_argument("thread_id")
    p = sub.add_parser("unresolve"); p.add_argument("thread_id")
    p = sub.add_parser("comment"); p.add_argument("pr")
    p.add_argument("--body"); p.add_argument("--body-file")
    p = sub.add_parser("request-review"); p.add_argument("pr")
    p.add_argument("--reviewer", default=COPILOT_REVIEWER)

    args = parser.parse_args()
    if args.cmd == "fetch":
        json.dump(fetch(args.pr), sys.stdout, indent=2)
        print()
    elif args.cmd == "summary":
        summary(args.pr)
    elif args.cmd == "reply":
        reply(args.pr, args.comment_id, read_body(args))
    elif args.cmd == "resolve":
        resolve(args.thread_id)
    elif args.cmd == "unresolve":
        resolve(args.thread_id, undo=True)
    elif args.cmd == "comment":
        comment(args.pr, read_body(args))
    elif args.cmd == "request-review":
        request_review(args.pr, args.reviewer)


if __name__ == "__main__":
    main()
