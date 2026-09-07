# .pen → CSS property cheatsheet

Quick translation table for comparing values read from the `.pen` file (via the
`pencil` MCP `execute` tool) against this codebase's Tailwind/CSS output.
Full schema: ask the `pencil` MCP's `read_skill` tool for `pen-schema.md` if
you need something not covered here.

## Units — no conversion needed

Every numeric value in the `.pen` file (widths, gaps, padding, font sizes,
corner radii, shadow blur/offset) is a raw pixel number. This project's
design tokens in `src/app/globals.css` are also defined in raw `px`
(`--radius-md: 10px`, `--text-sm: 13px`, …), and components consume them via
Tailwind arbitrary values (`rounded-[var(--radius-md)]`). So a `.pen` value
of `10` and a CSS value of `10px` are the same number — compare them
directly, don't hunt for a rem/px mismatch.

## Property mapping

| `.pen` property | Meaning | CSS / Tailwind equivalent |
|---|---|---|
| `fill` (on frame/rect/text) | solid color, or `{type:"color",color:"#RRGGBBAA"}` | `background-color` (frame/rect) or `color` (text) |
| `fill` array | multiple fills stacked | rare in this design system; flag if seen, code has no equivalent pattern |
| `stroke` + `strokeWidth` | border | `border-width`/`border-color` |
| `cornerRadius` | corner radius, number or `[tl,tr,br,bl]` | `border-radius` |
| `effect: {type:"shadow", shadowType:"outer", offset, spread, blur, color}` | drop shadow / glow | `box-shadow: <x> <y> <blur> <spread> <color>` — **easy to miss**, code often has no `shadow-*`/`box-shadow` class where the design has one. Always check this explicitly per state, don't assume "no shadow" without checking. |
| `effect: {type:"shadow", shadowType:"inner", ...}` | inner shadow | `box-shadow: inset ...` |
| `effect: {type:"blur"}` | blur the node itself | `filter: blur(...)` |
| `effect: {type:"background_blur"}` | backdrop blur | `backdrop-filter: blur(...)` |
| `opacity` (on the node) | node-level opacity | `opacity` — this is how this design system represents **disabled** state (e.g. `opacity: 0.35`) rather than a different fill color. Compare against Tailwind `disabled:opacity-35` etc. |
| `padding` (frame) | `n` = all sides, `[v,h]` = vertical/horizontal, `[t,r,b,l]` = all four | `padding` |
| `gap` (frame) | main-axis gap between children | `gap` |
| `fontFamily`/`fontSize`/`fontWeight`/`letterSpacing`/`lineHeight` | text style | matching CSS properties. `lineHeight` in `.pen` is a **ratio** of font size (`1.0` = 100%), same convention as this project's usage |
| `textAlign` | horizontal text alignment | `text-align` |

## Reading resolved vs. raw values

`Get(nodeId, {depth, resolveVariables:true})` returns **resolved** hex/number
values — good for a quick visual diff against the code's computed styles.

But also read **without** `resolveVariables` at least once per component, and
cross-reference with `GetVariables()`. A design value that references a named
variable (`fill:"$primary"`) but whose code counterpart hardcodes a literal
hex is a real (if invisible-when-resolved) parity gap worth flagging — it
means a future palette change in the design won't propagate to code the same
way `--color-primary` does. Prefer flagging clear mismatches over token-naming
nitpicks: if the resolved values match exactly, don't fail the audit over the
variable-vs-hardcoded distinction — mention it as a secondary note only when
raised value comparisons already surface a real difference nearby.

## What screenshots catch that values don't (and vice versa)

- Colors, spacing, radius, shadow, opacity, font metrics: read as **concrete
  values** from both sides (`.pen` via `execute`/`Get`, code via
  `getComputedStyle` in the live Storybook page) and diff the numbers
  directly. This is more reliable than eyeballing two screenshots — a
  1px padding difference or a slightly-off hex value is easy to miss visually
  but trivial to catch as a number diff.
- Icon choice/weight, text truncation, layout composition at real content
  lengths, and anything about how a *state transition* feels (does hover
  actually trigger, does the dropdown menu actually open in the right place)
  are best confirmed with a real screenshot from the live browser tab.

Use both: values for the objective diff, screenshots to sanity-check the
whole picture and catch what value-diffing can't.
