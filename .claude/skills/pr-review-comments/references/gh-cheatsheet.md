# `gh` cheatsheet for PR review threads

Raw commands behind `scripts/pr_comments.py`, for the cases the script doesn't cover.
`OWNER/REPO` come from `gh repo view --json owner,name`.

## Identify the PR

```bash
gh pr view --json number,headRefName,baseRefName,url        # PR for the current branch
gh pr view 42 --json number,headRefName,baseRefName,headRefOid,body
gh pr diff 42                                                # full diff against base
gh pr checkout 42                                            # switch to the head branch
```

## Read

```bash
# Inline review comments (REST) — no resolved state, but has in_reply_to_id
gh api repos/OWNER/REPO/pulls/42/comments --paginate

# One comment, with its diff hunk
gh api repos/OWNER/REPO/pulls/comments/4026445316

# Reviews (the summary bodies, APPROVED / CHANGES_REQUESTED / COMMENTED)
gh api repos/OWNER/REPO/pulls/42/reviews --paginate

# Top-level (issue) comments
gh api repos/OWNER/REPO/issues/42/comments --paginate

# Threads with resolved / outdated state — only via GraphQL. This is the FIRST PAGE only:
# both connections stop at 100. Re-run with `-f cursor=<endCursor>` while `hasNextPage`
# is true (and page a long thread's `comments` the same way, via `node(id:PRRT_...)`),
# or just use `scripts/pr_comments.py fetch`, which does all of that.
gh api graphql -F owner=OWNER -F repo=REPO -F pr=42 -f query='
query($owner:String!,$repo:String!,$pr:Int!,$cursor:String){
  repository(owner:$owner,name:$repo){ pullRequest(number:$pr){
    reviewThreads(first:100,after:$cursor){
      pageInfo{ hasNextPage endCursor }
      nodes{
        id isResolved isOutdated path line originalLine
        comments(first:100){
          pageInfo{ hasNextPage endCursor }
          nodes{ databaseId author{login} body url diffHunk }
        }
      }
    }
  }}
}'
```

The `databaseId` of a comment is the number in its URL (`#discussion_r4026445316`).
The thread `id` (`PRRT_...`) is only available through GraphQL.

## Write

```bash
# Reply inside an existing thread (COMMENT_ID = databaseId of the thread's root comment)
gh api repos/OWNER/REPO/pulls/42/comments/COMMENT_ID/replies -X POST -F body=@reply.md

# Resolve / unresolve a thread
gh api graphql -f query='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread{ isResolved } } }' -f id=PRRT_xxx
gh api graphql -f query='mutation($id:ID!){ unresolveReviewThread(input:{threadId:$id}){ thread{ isResolved } } }' -f id=PRRT_xxx

# Top-level PR comment
gh pr comment 42 --body-file summary.md

# Start a NEW inline thread on a line of the PR head (rarely needed here)
gh api repos/OWNER/REPO/pulls/42/comments -X POST \
  -f body='...' -f commit_id=HEAD_SHA -f path=src/x.ts -F line=12 -f side=RIGHT

# Ask Copilot for a fresh review round (it does NOT re-review on push by itself, and
# `gh pr edit --add-reviewer copilot` fails: "Could not resolve user with login 'copilot'")
gh api repos/OWNER/REPO/pulls/42/requested_reviewers -X POST -f 'reviewers[]=copilot-pull-request-reviewer[bot]'
# Copilot never appears in requested_reviewers; confirm via the timeline instead
gh api repos/OWNER/REPO/issues/42/timeline --paginate -q '.[] | select(.event=="review_requested") | .requested_reviewer.login'

# Re-request a human reviewer
gh pr edit 42 --add-reviewer some-login
```

`-F body=@file` reads the body from a file, which is the safe way to pass markdown with
backticks and newlines through the shell.

## Cross-repo lookups (verifying a comment that cites another repo)

```bash
# A file at the default branch, decoded
gh api repos/OWNER/OTHER_REPO/contents/src/routes/workouts.ts -q .content | base64 -d

# Search code in the other repo
gh api "search/code?q=repo:OWNER/OTHER_REPO+PRECONDITION_FAILED" -q '.items[].path'

# A file at a specific ref
gh api "repos/OWNER/OTHER_REPO/contents/docs/api-contract.md?ref=main" -q .content | base64 -d
```
