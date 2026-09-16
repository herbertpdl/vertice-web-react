---
name: pr-review-comments
description: Works through every review comment on a GitHub pull request of the current repository — fetches all open threads (from humans and from bots like Copilot / CodeRabbit), verifies each claim against the actual code, implements the ones that hold up as one commit per comment on the PR's own branch, pushes, replies in every thread (what was changed, or a specific justification for not changing it) resolves the addressed threads, and asks the reviewer (Copilot by default) for a fresh review round. Use this whenever the user asks to "address", "handle", "answer", "respond to", "go through", "triage" or "fix" review comments, review feedback, Copilot's/the reviewer's findings, or "the comments on PR #N" — including phrasings like "Copilot left a bunch of comments on my PR", "reply to the reviewer", "see what the review said and fix what makes sense", or "there's review feedback on this branch", even when the word "comment" never appears. Also use it when asked to check whether a reviewer's finding is actually right.
---

# PR review comments: verify, answer, address

A review round is a conversation, not a to-do list. Some findings are real bugs, some
misread the code, some are right but belong elsewhere, and some are matters of taste.
The job here is to treat each one the way a careful senior engineer on this repo
would: check whether it is actually true, fix what deserves fixing, and give the
reviewer a precise, verifiable answer either way — then leave the PR in a state where
the reviewer only has to look at the disagreements.

The run is autonomous end to end (analyze → fix → commit → push → reply → resolve →
request the next review round).
The user reviews the result on GitHub afterwards, so the quality bar is: every reply
and every commit should read well to a human who was not in this session.

`scripts/pr_comments.py` (next to this file) wraps the `gh` calls this needs — fetching
threads with their resolved state, replying in-thread, resolving. Use it instead of
re-deriving the GraphQL/REST plumbing. `python3 <skill-dir>/scripts/pr_comments.py --help`
lists the subcommands. `references/gh-cheatsheet.md` has the raw `gh` commands for the
cases the script does not cover.

## Step 0 — find the PR and stand on its branch

- If the user named a PR (number or URL), use it. Otherwise `gh pr view --json number,headRefName`
  finds the PR for the current branch; if there is none, ask which PR.
- Require a clean working tree before touching git at all: `git status --porcelain`
  must be empty (untracked files included). If it isn't, stop and tell the user — never
  stash, discard or commit their uncommitted work to make room. This applies whether or
  not you are already on the right branch: a `git pull` on a dirty tree can fail halfway,
  and a per-comment commit made on top of stray changes would sweep them in.
- Fixes are committed to the PR's **head** branch. A matching branch name is not
  enough — a local branch can share the name and track something else. Check
  `git branch --show-current` against the PR's `head_ref` *and* that the branch tracks
  the PR's head repo (`git rev-parse --abbrev-ref @{upstream}` is `origin/<head_ref>`
  for a same-repo PR; a fork PR needs the fork remote). If either fails, switch with
  `gh pr checkout <n>`, which sets the right upstream.
- Pull (`git pull --ff-only`) so you are on the same commit the reviewer saw, and confirm
  `git rev-parse HEAD` equals the PR's `head_sha` before changing anything. Note the
  PR's `base_ref`. Stacked PRs (base is another feature branch, not `main`) are normal
  in this workflow; that just means the diff you care about is `base..head`.
- Skim the PR description and the diff (`gh pr diff <n>`) once before reading comments,
  so you judge each comment against what the PR is actually trying to do.

## Step 1 — collect every open thread

```bash
python3 <skill-dir>/scripts/pr_comments.py summary <n>     # quick human view
python3 <skill-dir>/scripts/pr_comments.py fetch <n> > <scratch>/threads.json
```

Work from the JSON. For each thread you get: `thread_id` (for resolving),
`root_comment_id` (for replying), `path`/`line`, `is_resolved`, `is_outdated`, the
`diff_hunk`, and every comment in the thread in order.

Which threads need action:

- **Unresolved threads** — the main workload.
- **Threads where the last comment is the reviewer's** — even if someone (the user, a
  previous run) already answered earlier. The reviewer came back; read the whole
  exchange and continue it, don't restart it.
- **Threads where the last comment is the PR author's and nothing followed** — skip;
  that thread is waiting on the reviewer. Exception: a thread the PR author started
  themselves (`root_author` is the PR's own author, e.g. a self-review note) is never
  waiting on anyone else — treat it as the user's own to-do (see "Things that go wrong"
  below) even if no one replied to it.
- **Resolved threads** — skip.
- `is_outdated: true` means the lines moved since the comment. The point may still
  apply; check the current code before deciding it's stale.

Also read the review **bodies** (the `reviews` array — e.g. Copilot's "Changes
recommended" summary). They are usually a digest of the inline threads, but sometimes
carry a finding that has no thread. Such a point gets handled like any other and
answered in a top-level comment (`pr_comments.py comment`) since there is no thread to
reply in. Same for `issue_comments` that ask for something.

## Step 2 — verify each comment against reality

This is where the value is. Reviewers — bots especially — reason from the diff hunk
and pattern-matching; you have the whole repo, the tests, and the sibling repos. For
each thread:

1. **Read the actual code** at the PR head, not just the hunk — the function, its
   callers, and whatever the comment references (a validation schema, a spec section,
   another repo's contract). A large share of wrong findings come from a reviewer not
   seeing the caller that already handles the case.
2. **Reproduce the claim when it is reproducible.** "X can be undefined here" → trace
   the types. "This test doesn't cover Y" → read the test. "This breaks when Z" → write
   a quick unit test or a node one-liner if that's cheap. A finding you confirmed by
   running something is worth far more than one you agreed with by reading.
3. **Cross-repo claims need the real source, not the docs.** A comment like "the BFF
   contract documents this endpoint as `{name}` only" is checking a markdown file.
   Look at the actual route/handler/DTO in that repo (`gh api repos/<owner>/<repo>/contents/<path>`,
   or a sibling checkout if one exists) — in this project family the contract docs
   have drifted from the code before. If the docs are wrong, say so in the reply; that
   is a legitimate finding about the other repo, not about this PR.
4. **Check the project's own rules.** CLAUDE.md, the feature's PRD/spec, and existing
   conventions can make a "fix" wrong (e.g. a reviewer asking for `useMemo` in a repo
   where the React Compiler handles it, or asking to reintroduce a behaviour the PRD
   explicitly retired). When the PRD/spec settles the question, cite the section.
5. **Check whether it is already handled** — by a later commit on the branch, by a
   different layer (the BFF validates it, the DB constraint prevents it), or by a test
   that already exists.

Then classify:

| Verdict | Meaning | What happens |
|---|---|---|
| **fix** | Correct, and the change belongs in this PR | Implement, commit, reply with the SHA, resolve |
| **fix-differently** | The problem is real but the suggested remedy isn't the right one | Implement your version, explain why in the reply, resolve |
| **decline** | The claim is wrong, or the change would make things worse | Reply with specific evidence; leave the thread open |
| **out-of-scope** | Real, but belongs in another PR / another repo / a follow-up | Reply saying where it belongs (and open the follow-up if that's cheap); leave open unless the reviewer explicitly framed it as non-blocking |
| **already-addressed** | Handled by existing code or an earlier commit | Reply pointing at the code/commit that handles it, resolve |

Calibration, because both failure modes are easy to fall into:

- Agreeing with everything is not politeness, it's abdication — it dumps the judgement
  back on the user and can introduce regressions that the reviewer never asked to own.
  If you cannot say concretely what breaks without the change, you have not verified it.
- Defending everything is the mirror image. Bot reviewers are often right about
  boundary conditions, stale docs, and accessibility, and a nit (typo, stale path in a
  doc, wrong word) costs less to fix than to argue about. Fix nits without ceremony.
- "It's a valid concern but this PR isn't the place" is a real category; use it
  honestly, not as a way to avoid work. If the fix is a few lines and touches files
  already in the diff, it's in scope.
- Two comments making the same point (e.g. the same handle pattern in two components)
  get the same verdict and the same fix — don't fix one and decline the other.

## Step 3 — implement the accepted ones, one commit per comment

Order: nits and doc fixes first (fast, low risk), then the substantive ones. For each
**fix** / **fix-differently**:

- Make the smallest change that fully addresses the point, and stage only the files
  you changed for it (`git add <paths>`, never `git add -A`). Match the surrounding
  code's style. If the comment concerned behaviour, add or extend a test where the repo
  has tests for that layer — a reviewer who found a bug will look for the test.
- If two threads are genuinely one change (the duplicated-pattern case above), one
  commit may address both; say so in both replies.
- Run the repo's checks for what you touched before committing — lint, type-check,
  and the relevant tests (see the repo's CLAUDE.md for the exact commands; here that is
  `npm run lint`, `npx tsc --noEmit`, and `npx vitest run --project <name>` for each
  project `vitest.config.ts` defines on the branch — `storybook` on `main`, plus `unit`
  on branches that add `src/lib` tests — when you touched something it covers). Don't
  commit red.
- Commit in the repo's message convention (conventional commits here), with a body
  that links the thread so the history explains itself:

  ```
  fix(workout-editor): keep explicit zero reps in the set draft

  `undefinedIfZero` was erasing a value the schema explicitly allows.

  Addresses review comment: https://github.com/<owner>/<repo>/pull/<n>#discussion_r<id>
  ```

  End the message with the `Co-Authored-By:` line this session's conventions require.

If a fix turns out to be much larger than it looked (touches a design decision, needs
a spec change, needs another repo), stop, downgrade it to **out-of-scope** with an
honest reply, and move on — don't ship a half-fix.

## Step 4 — push, then reply and resolve

Push once when all commits are in (`git push`), so the SHAs you cite in replies are
real links. Then, for every thread you handled:

```bash
python3 <skill-dir>/scripts/pr_comments.py reply <n> <root_comment_id> --body-file <scratch>/reply-<id>.md
python3 <skill-dir>/scripts/pr_comments.py resolve <thread_id>      # fix / fix-differently / already-addressed only
```

Write replies to files (`--body-file`) — shell quoting mangles backticks and newlines.

Reply style — short, specific, in the reviewer's language (English for Copilot):

- **fix**: what changed and where. `Fixed in abc1234 — `undefinedIfZero` now only maps `null`/`NaN`, and the model test covers `reps: 0`.`
- **fix-differently**: the same, plus one sentence on why not the suggested remedy.
- **decline**: the evidence, not a feeling. Point at the line, the caller, the test,
  the spec section, or the other repo's source that shows the claim doesn't hold.
  `Not changing this: `flush()` is only reachable after `markDirty()` (autosave.ts:210), so the no-dirty branch can't run with a refused source. `autosave.test.ts` "refused source keeps draft dirty" exercises exactly this.` If you are declining on cost/benefit rather than correctness, say that plainly.
- **out-of-scope**: acknowledge it's real, say where it goes, link the follow-up if you opened one.
- **already-addressed**: where it's handled.

No preamble ("Thanks for the review!"), no hedging, no restating the comment. One
reply per thread; if you addressed two threads with one commit, each gets its own
short reply citing the same SHA. Don't resolve a thread you declined — that's the
reviewer's call.

## Step 5 — ask for the next review round

Once every thread has its reply and the push is up, request a fresh review — the
reviewer should look at the new commits and at your justifications on the open
threads, and a bot reviewer does not do that on its own: Copilot only re-reviews when
asked (its own summary says "get a fresh assessment by requesting another Copilot
review", and pushing more commits does not trigger one).

```bash
python3 <skill-dir>/scripts/pr_comments.py request-review <n>                 # Copilot (default)
python3 <skill-dir>/scripts/pr_comments.py request-review <n> --reviewer <login>   # a human reviewer
```

Request it from whoever wrote the comments you handled: Copilot for Copilot's threads,
the human for theirs (both, if both reviewed). Do this even when you declined
everything — the reviewer still needs to see the answers. Skip it only when you
handled nothing at all (no open threads). Copilot never shows up in the PR's
requested-reviewers list; the `review_requested` event on the PR timeline is the
confirmation, and its new review lands a few minutes later.

## Step 6 — report to the user

In the terminal, give a compact table: each thread (path:line, one-line gist),
verdict, and commit SHA or the one-line reason. Then the push result, the re-review
request, and anything you deliberately left alone (a thread waiting on the reviewer, a
fix that grew into a follow-up). The next round will arrive as new threads on the same
PR; running the skill again handles it, so say that.

## Things that go wrong

- **Stale `line` on outdated threads** — use `original_line` and the `diff_hunk` to
  find the code, then locate it in the current file by content, not by number.
- **The comment is on a file the PR doesn't own** (e.g. a docs line that another
  open PR also changes). Fix it here if it's about this PR's change; otherwise
  out-of-scope with a pointer to the other PR.
- **A suggestion block** (` ```suggestion `) is the reviewer's proposed patch. Apply it
  if it's right, but it still goes through the same verification — suggestion blocks
  are frequently subtly wrong about surrounding context.
- **Threads from the PR author themselves** (self-review notes) — treat as the user's
  own to-dos: fix, reply briefly, resolve.
- **`gh` failures** — the script passes the error through. A 403 on `resolve` usually
  means the token lacks write access to the repo; report it and leave the replies
  posted rather than retrying.
