# Design ⟷ code map (starting hint, not ground truth)

Last verified: 2026-09-03 (full audit run), against `/Users/herbertlago/Documents/Vertice Web.pen`.

pen.dev is a live collaborative canvas — the document can and will change
between audit runs (new components, renamed frames, added states). **Treat
everything below as a hint for where to look first, not a cached fact.**
Always re-run the discovery query in SKILL.md step 1 and trust what it
returns over this file. If a node id below no longer resolves, that's
expected — fall back to the name search, and while you're there, update this
file with what you find so the next run starts from a better hint.

## Top-level DS frames (found on the document root)

| Frame name | What it holds |
|---|---|
| `DS - Foundations` | base tokens overview |
| `DS - Buttons` | Button — Default/Hover/Disabled variants × Primary/Secondary/Outline/Ghost/Danger, plus a Sizes row (Small/Medium/Large) |
| `DS - Inputs & Dropdown` | Text Field (Default/Focused/Error/Disabled) and Dropdown (Closed/Open) + the open dropdown's menu item list |
| `DS - Header & Hero` | Header layout component |
| `DS - Tooltip, Image, Video` | Tooltip |
| `DS - Cards, Badges & Controls` | Metric Card, a "Badges Col" (Active/Done/Missed/Rest Day badges — these are **ad-hoc named instances, not a formal reusable variant set**), a "Controls Col" (Checkbox checked/unchecked, Switch/Toggle on) |
| `DS - Guidelines` | canonical color/typography/spacing-radius/components guide sections — read this first as the source of truth for global tokens before diffing individual components |
| `DS - Components Library (source)` | the master reusable symbols: Button, Text Field, Dropdown, Profile Menu, Logo Mark |
| `DS - Navigation & Profile Menu` | Profile Menu in context (frame id `c6Bft`, instance `nqyMQ` — no override, no shadow) |
| `DS - Loaders & Loading States` | **new frame since last verification** (id `IX1jE`) — Spinner (Small/Medium/Large refs), Skeleton Primitives (Line/Circle/Block), Button - Loading, Cards & Rows (Metric Card - Loading, Table Row - Loading, List Row - Loading), Page Overlay (Page Loading Overlay). This used to be scattered/implicit; it's now consolidated in its own top-level frame, separate from `DS - Cards, Badges & Controls`. |
| `DS - Mobile Components` | **new grouping frame** (id `Tskd4`) — all the `M `-prefixed mobile-product nodes now live under this single frame instead of being loose top-level siblings. Still not this repo's concern (web-only), just noting the container changed. |
| `Vertice — App Screens` | full-screen compositions using the components — useful for spotting a component used differently than its own DS frame shows. Contains two real Dialog examples: "Dialog - Novo Aluno" (`vV8K9`) and "Dialog - Novo/Editar Exercício" (`YBGQM`), both under `Vertice — App Screens > Row A/B` — see the Dialog gap below, no dedicated DS frame exists for Dialog, these in-context examples are the only source of truth. |

## Formally reusable components (`reusable: true`, appear in `get_app_state`)

Header, Tooltip, Metric Card, Button, Text Field, Dropdown, Profile Menu,
Logo Mark, Spinner, Skeleton Line, Skeleton Circle, Skeleton Block,
Button - Loading, Metric Card - Loading, Table Row - Loading,
List Row - Loading, Page Loading Overlay.

Everything prefixed `M ` (M Button, M Nav Bar, M Tab Bar, M Field, M Chip,
M Stat Card, M Badge, …) belongs to a **different, mobile product's** design
system living in the same file. This repo (`vertice-web-react`) is web-only —
ignore `M `-prefixed nodes entirely, they have no code counterpart here and
are not a gap.

## Components that exist in the design only as ad-hoc examples, not formal variant sets

Badge, Checkbox, and Switch are **not** in the reusable-components list — as
of the last check they exist only as single named instances inside
`DS - Cards, Badges & Controls`'s "Badges Col" / "Controls Col" (e.g. "Active
Badge", "Checked Box", "Toggle On"). That means the design currently only
shows *one* state each, not a full Default/Hover/Disabled set the way Button
does. Don't treat "no hover example for Badge" as a code bug — there's
nothing to compare it against yet. Do still compare whatever state the design
*does* show (colors, radius, spacing, type) against the matching code variant.

Dialog is also not in the reusable-components list and has no dedicated DS
frame — see the "Code → likely design name" table below for where its two
in-context examples live.

## Code → likely design name

| Code file | Design name to search for |
|---|---|
| `Button.tsx` | "Button" component / "DS - Buttons" frame |
| `Badge.tsx` | "Active Badge" / "Done Badge" / etc. inside "Badges Col" |
| `Checkbox.tsx` | "Checked Box" / "Unchecked Box" inside "Controls Col" |
| `Switch.tsx` | "Toggle On" inside "Controls Col" |
| `TextField.tsx` | "Text Field" component / "DS - Inputs & Dropdown" |
| `Dropdown.tsx` | "Dropdown" component |
| `Tooltip.tsx` | "Tooltip" component |
| `MetricCard.tsx` | "Metric Card" component |
| `ProfileMenu.tsx` | "Profile Menu" component |
| `Spinner.tsx` | "Spinner" component |
| `Skeleton.tsx` (Line/Circle/Block) | "Skeleton Line" / "Skeleton Circle" / "Skeleton Block" |
| `ListRowSkeleton.tsx` | "List Row - Loading" |
| `TableRowSkeleton.tsx` | "Table Row - Loading" |
| `PageLoadingOverlay.tsx` | "Page Loading Overlay" |
| `Dialog.tsx` | "Dialog - Novo Aluno" / "Dialog - Novo/Editar Exercício" in "Vertice — App Screens" (no dedicated DS frame) |

## A confirmed real gap (found while validating this skill, 2026-09-03)

`Button` primary variant has an **outer glow shadow** in the design on both
its Default and Hover states (`effect: {type:"shadow", shadowType:"outer",
color:"#00E5FF40", blur:20}` default, brighter/wider on hover) — the design's
Default/Hover/Disabled fill colors and the `--radius-md`/`--text-base` tokens
otherwise matched the code exactly. `Button.tsx`'s `variantClasses` has no
`shadow-*`/box-shadow at all for any variant. This is the kind of gap that's
invisible on the color/radius/spacing check and only shows up when you
specifically read the `effect` property — always check it per state, not just
on the default one.

## A second confirmed real gap (same validation pass)

`TextField`'s Disabled state, compared: design's "Disabled Field" example
(`kk6MS` → its `Field Box` child `Ym0yj`) has **no opacity change and no
border/fill change at all** from the Default field — `stroke`/`fill` are
identical to Default (`$color-border` / `$color-surface`). The only signal
that it's disabled is the inner text content itself, styled in the muted
help-text color (`#5C6A7C`) with placeholder-like content ("Not editable").
Code (`TextField.tsx`, the field container's className) instead applies
`disabled:opacity-35`-equivalent (`${props.disabled ? "opacity-35" : ""}`) to
the **entire** label+border+field wrapper, fading the border and background
along with the text — confirmed visually via
`components-ui-textfield--disabled` in Storybook (border becomes barely
visible). Two different disabled patterns: design uses "everything full
strength, only the value text is muted"; code uses "dim the whole control".
Worth a product/design conversation about which is intended — don't assume
the code is simply wrong without checking whether this was a deliberate
code-side call. Re-confirmed 2026-09-03: live computed opacity on the field
box is `0.35`, border color unchanged token-wise but visually washed out by
the opacity — still an open gap, not yet resolved.

## Third confirmed gap (2026-09-03 full audit): Dialog has no dividers, wrong panel padding, undersized close icon

Both Dialog examples in `Vertice — App Screens` (`vV8K9`, `YBGQM`) show the
same structure: the panel itself (`fill:#141A22`, `cornerRadius:16`,
`stroke:#333F50`) has **no padding or gap of its own** — instead each of the
three sections (Dialog Header, Dialog Body, Dialog Footer) has its own
`padding:20`, and Header + Footer additionally carry `stroke:#232C3A
strokeWidth:1` — i.e. divider borders separating header from body and
footer from body. The header's close icon is `18×18`.

`Dialog.tsx` (`src/components/ui/Dialog.tsx:68`) instead puts one uniform
`p-[var(--space-6)]` (24px) padding and `gap-[var(--space-5)]` (20px) on the
whole panel, and there is no border/divider between the title row and the
children at all — confirmed live via `components-ui-dialog--default`:
computed `headerBorder` is `0px solid`, panel `padding` is a flat `24px`,
`gap` is `20px`. The close button's icon (`Dialog.tsx:83`, `<X width={16}
height={16}/>`) is 16×16 vs the design's 18×18. Net effect: code renders a
plainer, undifferentiated panel where the design calls for a header strip
and footer strip visually separated from the body by hairline borders, with
per-section 20px padding instead of one 24px wrap.

## Fourth confirmed gap (2026-09-03, found via user report, not the audit run): `--color-border` fails contrast against surface fills

A user reported that `TextField`'s border is invisible except while
focused, and that `Dropdown` looks "taller" than `TextField` next to it on
`/planos/[planId]/treinos/[workoutId]` (real app, not Storybook). Measured:
`getBoundingClientRect` proves the two are pixel-identical in height/position
(both `43px`, same top/bottom) — there is no layout bug. Forcing a bright
`border-color` via devtools showed the border paints at full width with no
clipping/occlusion on either element. The actual cause: `--color-border`
(`#232C3A`) against `--color-surface`/field fills (`#141A22`) computes to
**~1.24:1 WCAG contrast** — nowhere near the `3:1` non-text minimum (SC
1.4.11) — and this exact pair is used **identically in both the `.pen` file
and the code** for both components' default state, so the original
value-diff audit (2026-09-03) scored it a pass. What the user perceives as
"only visible on hover" is actually the `focus-within:border-[var(--color-primary)]`
state swapping to `#00E5FF` (high contrast) — there is no real hover state
on the border at all. Confirmed present identically in Storybook
(`components-ui-textfield--empty`, `components-ui-dropdown--placeholder`)
and the real app — Storybook and the app render these two components
byte-identical (same computed `border`/`bg`/`radius`/`height`), so this is
not a Storybook-vs-app parity gap, it's a design-token problem that both
surfaces faithfully reproduce. `--color-border-strong` (`#333F50`, used by
Outline Button, ProfileMenu, Dialog, Tooltip) fares a little better at
~1.64:1 but is still under threshold. See SKILL.md Step 3.5 — this is the
gap that motivated adding contrast checking to the audit.

**Correction (2026-09-03, follow-up run):** the claim above that the
border/fill pair is "used identically in both the .pen file and the code" is
wrong about the fill. Fresh reads of the reusable "Text Field" (`MsIFr` →
`vo8h3` Field Box) and reusable "Dropdown" (`S8v0qW` → `F4Z6s5` DD Box)
symbols, plus both DS frame instances (`y0M1u`'s `S7mEYo`/`PjgVJ`), all spec
`fill:"$color-bg"` (`#0A0E14`) — not `$color-surface`. `TextField.tsx:26` and
`Dropdown.tsx`'s `md` size (`bg-[var(--color-surface)]` at what's now
lines ~37/41) both use `--color-surface` (`#141A22`) instead. Confirmed live:
`components-ui-textfield--empty` and `components-ui-dropdown--placeholder`
both compute `background-color: rgb(20, 26, 34)` (`#141A22`). This is a real,
previously-uncaught color-token mismatch, independent of the contrast issue —
swapping to `--color-bg` would match the design but would NOT fix contrast
(border-vs-bg computes to ~1.37:1, still under the 3:1 minimum — worse odds
even than the 1.24:1 against surface). Both fixes are needed separately.

## Fifth finding (2026-09-03, follow-up run): `Dropdown`'s new `compact` size has no design counterpart

`Dropdown.tsx` gained a `size?: "md" | "compact"` prop (used by
`SetRow.tsx:54` for the per-set strategy picker) with no corresponding
variant anywhere in the .pen file — checked both the reusable "Dropdown"
symbol (`S8v0qW`) and the "DS - Inputs & Dropdown" frame (`y0M1u`); neither
shows more than one size. Per SKILL.md's own guidance this isn't necessarily
a bug (code implemented ahead of the design) — flag for a design pass rather
than treating it as broken. Note the irony: the `compact` variant's own
background token choice (`bg-[var(--color-bg)]`) is actually the *correct*
one per the design spec above, unlike the pre-existing `md` size.
