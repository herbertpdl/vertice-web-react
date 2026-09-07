---
name: pencil-design-audit
description: Audits this repo's design-system components (src/components/ui/*) against the pen.dev "Vertice Web" design file for true pixel-level parity — every color, spacing value, corner radius, shadow/glow effect, and typography setting, AND every interactive state (default, hover, active, focus, disabled, loading, open) — by reading concrete values out of the .pen file and comparing them against a live Storybook rendering driven by real browser interaction, not by eyeballing two screenshots. Use this whenever the user asks whether the UI "matches the design", wants a design-system parity check, asks for a pixel-perfect audit, wants to confirm components are "up to date" or "in sync" with Pencil/pen.dev, mentions checking hover/focus/disabled states against the design, or asks to verify a specific component (e.g. "does Button match Pencil") — even if they don't use the word "audit" or name pen.dev explicitly. Also trigger after a Pencil/design-system sync task (per CLAUDE.md, "regenerating/syncing via the pencil MCP tool") to confirm the sync was actually complete.
---

# Pencil design audit

Checks that `src/components/ui/*` actually renders what
`/Users/herbertlago/Documents/Vertice Web.pen` specifies — not just "looks
roughly right", but matching hex colors, exact px spacing/radius, shadow
effects, type settings, and every state the design shows (hover, active,
focus, disabled, loading, open). Two systems drift silently over time:
catching that drift is the whole point, so favor extracting objective values
over subjective visual comparison wherever possible.

## Why values, not just screenshots

Two screenshots that "look the same" can still differ by a few percent of
opacity or a couple of pixels of padding — the kind of thing a human
eyeballing two PNGs will miss and a number diff won't. So the core loop of
this skill is: **read a concrete value from the design, read the matching
computed value from the live rendered code, diff the numbers.** Screenshots
are for the things numbers can't capture — real state transitions actually
firing, icon/glyph correctness, whether a dropdown menu opens in a sane
position. Read `references/schema-cheatsheet.md` before you start extracting
values — it maps every `.pen` property to its CSS equivalent and, importantly,
notes that this project's design tokens are all raw px, so no unit conversion
is needed anywhere in this audit.

## Step 0 — get the environment live

You need three things running at once. Check each before starting rather than
assuming:

1. **The pen.dev file** — call `mcp__pencil__get_app_state`. If
   `Vertice Web.pen` isn't the active canvas editor, that's fine: pass
   `filePath: "/Users/herbertlago/Documents/Vertice Web.pen"` explicitly on
   every `execute` call instead of relying on it being the frontmost tab.
2. **Storybook** — `curl -s -o /dev/null -w "%{http_code}" http://localhost:6006`.
   If it's not a `200`, start it with
   `nohup npm run storybook > /tmp/storybook.log 2>&1 &` (use this session's
   job tmp dir for the log if you have one) and poll the same curl until it
   comes up (typically ~5-10s). Don't use `npm run dev` — Storybook renders
   components in isolation with controlled args, which is what you need for
   per-state screenshots; the real app's pages only show whatever state that
   page happens to be in.
3. **Chrome** — load the browser tool set if not already loaded:
   `ToolSearch("select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__javascript_tool")`.
   The `javascript_tool` is what lets you read exact `getComputedStyle()`
   values from the rendered story instead of just looking at it — load it now,
   you'll need it in step 3.

Fetch `http://localhost:6006/index.json` once you're up — it's the
authoritative list of every story id (`components-ui-button--primary`, etc.)
and avoids guessing URLs.

## Step 1 — discover the design ⟷ code mapping, fresh, by name

Don't trust stale node ids across runs — the document changes. Read
`references/design-map.md` for a **starting hint** (which DS frames exist,
which components are formally reusable vs. ad-hoc examples, a code-file →
design-name table), but verify it live in this step, since it may have
drifted since it was last verified. Update that file with anything you find
that's changed — it saves the next run real work.

Run a discovery `execute` call against the document root to confirm the
current frame/component structure:

```js
Get(n => (n.name?.startsWith("DS - ") || n.reusable) && Print(n.id, "|", n.name, "|", n.reusable ? "component" : "frame"))
```

Then for each `DS - *` frame relevant to a component you're auditing, list
its children a couple of levels deep (see the pattern already used in
`design-map.md`'s discovery) to find the state/variant sub-frames.

Build your working list as: **code file → matching design frame/component
name(s) → which states the design actually demonstrates**. Two kinds of gaps
are worth surfacing right at this step, before you even compare values:

- A code component in `src/components/ui/` with no design counterpart at all
  (implemented ahead of the design, or the design was renamed).
- A design component/frame with no code counterpart (not yet implemented).

Skip anything prefixed `M ` (or otherwise clearly under a different product's
design system, per `design-map.md`) — that's a separate mobile app sharing
the same `.pen` file, not this repo's job.

## Step 2 — pull concrete values out of the design

For every state sub-frame you found (Default, Hover, Disabled, Focused,
Error, Open, Loading, Sizes — whatever the design actually shows), read it
with enough depth to capture its own properties and its label/content text's
style:

```js
Print(Get(nodeId, {depth: 1, resolveVariables: true}))
```

Capture: `fill`, `stroke`/`strokeWidth`, `cornerRadius`, `effect` (shadow —
**check this explicitly on every state, not just default**, it's the easiest
thing to miss), `padding`, `gap`, and the child text's `fontFamily`,
`fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`.

If a component's design frame demonstrates fewer states than the code
implements (or vice versa), that asymmetry is itself worth reporting — it's
either an undocumented design decision or a missing example, not necessarily
a bug, so phrase it as an observation rather than a failure.

## Step 3 — read the matching computed values from the live code

Navigate Chrome to the story: `http://localhost:6006/iframe.html?id=<story-id>&viewMode=story`
(the bare `iframe.html` URL renders just the component with no Storybook
chrome around it — cleaner for both screenshots and DOM queries than the
`?path=/story/...` UI wrapper).

Stories tagged with a `play` function (Dropdown's `Open`, Tooltip's
`Top`/`Bottom`/`Left`/`Right`, TextField's `Focused`) already render **in**
that state as soon as the page loads — no extra interaction needed, just
navigate and read/screenshot. For states not baked into a story as a `play`
(a live `:hover` on Button/Badge/Checkbox/Switch, keyboard `:focus-visible`),
drive them for real:

- Hover: `mcp__claude-in-chrome__computer` with `action: "hover"` at the
  element's coordinates (screenshot first to find them, or use `find`/
  `read_page` to get a ref and hover by `ref`).
- Keyboard focus: click the page background first (so focus starts outside
  the component), then `action: "key"` with `text: "Tab"` until the element
  is focused, then read/screenshot.
- `:active` (mouse held down) can't be produced with the click primitives
  available (`left_click` completes the press instantly) — don't try to fake
  it with a screenshot. Instead compare the `active:` Tailwind class's
  resolved token value against the design's pressed/active example directly,
  the same way you'd compare default/hover.

For the objective value diff, use `javascript_tool` to run `getComputedStyle`
on the actual rendered element inside the iframe, e.g.:

```js
const el = document.querySelector('button, [role="switch"], input, [class*="rounded"]');
const cs = getComputedStyle(el);
({ bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, shadow: cs.boxShadow, padding: cs.padding, font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight });
```

Adjust the selector per component. `getComputedStyle` returns colors as
`rgb()`/`rgba()` — convert the design's hex (or vice versa) before comparing,
don't eyeball whether they "look close".

Take a screenshot of each state too (`computer` `action: "screenshot"`, or
`zoom` on just the component's region) — keep these as your evidence and as
the catch-all for anything the value diff can't express. **Always include the
plain default/closed/empty state in this screenshot pass, not just the
error/disabled/open states** — a border or fill that's barely legible against
its own background hides in exactly the state you're least likely to zoom
into on purpose, since nothing about it looks "wrong" in isolation. If you
only screenshot the states you already suspect are broken, you will miss
this category of bug every time.

## Step 3.5 — check contrast, not just equality

A code value matching its design value exactly is not the same as that value
being any good. `.pen` and the code can agree down to the hex digit and still
render a border, divider, or icon that's functionally invisible on the
target background — this project's own `--color-border` (`#232C3A`) against
`--color-surface`/field fills (`#141A22`) is a confirmed real example: ~1.24:1
contrast, nowhere near the WCAG 2.1 non-text contrast minimum of 3:1, and
identical in both the `.pen` file and the code, so a pure value-diff scores
it a pass. Two components can even share this exact pairing and still read
completely differently to a user, purely from context (box width, an
adjacent icon breaking up the silhouette, how much surrounding chrome
"anchors" the shape) — don't conclude "no gap" just because two instances of
the same low-contrast pair happen to look similarly faint or similarly fine
in your screenshots; the contrast problem is real either way.

For every `border`/`stroke` value you extract in Step 2, and every text
`fill` against its container's `fill`, compute the WCAG contrast ratio
against the color it sits on (relative luminance formula; `3:1` minimum for
UI component boundaries/non-text per SC 1.4.11, `4.5:1` for normal text,
`3:1` for large text per SC 1.4.3). Flag anything under threshold as a
finding **even when code matches design exactly** — matching a design value
that fails contrast is still shipping a contrast failure, and it's worth
surfacing to the design side too, not just treating as a code gap. Don't
compute this only for colors that already look suspicious in a screenshot —
compute it for every border/stroke pair you extract, since the whole point
is that these fail silently.

## Step 4 — compare and report

For each component, produce a table: **property | design value | code value
| verdict**. Group findings so the important ones aren't buried:

1. **Contrast failures** (Step 3.5) — a border/stroke or text color under
   the WCAG threshold against its background, reported with the actual ratio
   (e.g. "1.24:1, needs 3:1"), regardless of whether it matches design. These
   are easy to miss because nothing about them trips a value-diff, and easy
   to underrate because a screenshot of the isolated component can look
   "fine enough" — call out the ratio explicitly so it can't be waved off.
2. **Missing or extra effects** (shadows/glows especially — see the real
   example in `design-map.md` where a Button glow effect existed in the
   design with zero code equivalent) and any color/token mismatch.
3. **Spacing/radius/typography deltas**, even small ones — state the exact
   numbers (design says `10px`, code renders `8px`), not "slightly off".
4. **State coverage gaps** — a state the design shows that the code doesn't
   implement, or vice versa.
5. Minor/cosmetic notes last.

For each finding that's a real code bug (not a design-only gap), point at the
exact file and line (`src/components/ui/Button.tsx:20`) and say concretely
what class/value would close the gap — you're producing something actionable,
not just a diff dump. Don't fix anything yourself unless the user asks you
to; this skill's job is the audit, not the patch.

If you found and fixed a stale/wrong entry in `references/design-map.md`
while doing this (a renamed frame, a component that gained a formal variant
set, a new DS frame), save that update — it's cheap now and saves the next
run a full rediscovery.

## Cleanup

Close any Chrome tabs you opened for this (`tabs_close_mcp`). Leave Storybook
running if you started it — it's a normal dev dependency the user will likely
want again; mention in your summary that it's up on `:6006` and how to stop
it (`pkill -f "storybook dev"` or just note the background job if this
session has one) if they'd rather not leave it running.
