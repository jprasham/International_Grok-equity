# Design tokens — Market Pulse

Visual direction for Ticker Research: charcoal surfaces, emerald signal accent, ticker-first
heroes, and kinetic researching motion. Implementation lives in `app/globals.css`. Components use
the shadcn names in the first column.

## Colour

Dark is the reference. Light is the same hierarchy with a darkened emerald for contrast on light
surfaces.

| shadcn token | Role | Dark | Light |
| --- | --- | --- | --- |
| `background` | page | `#101214` | `#f4f7f5` |
| `card`, `popover` | elevated | `#15181c` | `#ffffff` |
| `secondary`, `muted` | elevated-2 | `#1a1f1c` | `#e6efe9` |
| `accent` (hover wash) | emerald tint | `rgba(52,211,153,0.08)` | `rgba(4,120,87,0.08)` |
| `foreground` | text | `#f2f4f6` | `#101214` |
| `dim` | secondary text | `#c5d0cb` | `#2f3d35` |
| `muted-foreground` | faint | `#86a0a8` | `#4a5c52` |
| `primary`, `ring`, `live` | signal | `#34d399` | `#047857` |
| `primary-foreground` | on signal | `#052e1a` | `#ffffff` |
| `border` | rules | `#2a3530` | `#c9d5ce` |
| `border-soft` | soft rules | `#1f2823` | `#dfe8e2` |
| `input` | field border | `#5a6b62` | `#6b7c72` |
| `beta` | secondary live | `#2dd4bf` | `#0f766e` |
| `destructive` | failure | `#e05252` | `#b91c1c` |

Heroes use `pulse-wash`: a soft emerald radial over a card→background gradient. Not purple glow.

## Type

Self-hosted through `next/font`.

| Role | Font | Used for |
| --- | --- | --- |
| `font-sans` / `font-display` | DM Sans 400–700 | UI, body, heroes |
| `font-mono` | JetBrains Mono 400–600 | labels, tickers, data, chips, codes |

| Element | Size and style |
| --- | --- |
| Body | 13px / 1.5 (`text-sm`) |
| Page title | 28–36px / 1.1, 700, tight tracking |
| Eyebrow | 11px mono, uppercase, 0.16em, primary |
| Brand | 15px, 700; `◆` in primary |
| App name | 11px mono, 0.06em, muted |
| Label (`term-label`) | 11px mono, uppercase, 0.1em |
| Section code | 11px mono, 600, 0.14em, primary |

Report page titles are tickers → JetBrains Mono.

## Shape, spacing, motion

| Token | Value |
| --- | --- |
| Radius: cards, inputs, buttons | 4px (`--radius`) |
| Radius: chips | 2px (`rounded-sm`) |
| Header height | 56px; two rows below `sm` |
| Content width | 1152px (`max-w-6xl`) |
| Motion | CTA press (`active:translate-y-px`); researching pulse bar; signal-dot pulse. All `motion-safe`. |

## Components

- **Header:** sticky, `card` surface, bottom border. Brand divider. Tabs with 2px primary underline.
  Exchange pills + theme toggle on the right.
- **Hero:** `pulse-wash`, bottom border, optional stats on the right (value above label).
- **Research home:** one composition — brand signal, headline (“Find the next signal.”), short sub,
  form, compact accepted-format chips. Not a two-column dashboard.
- **Status chips:** mono uppercase; done/researching use live/primary emerald tints.
- **Researching:** emerald track with indeterminate pulse bar; stepped mono labels.
- **Structured report:** rating chip, summary, metric strip, titled sections, risks list.
- **HTML report frames:** stay white in both themes; sandboxed as before.
- **Footer:** `card` surface, mono strip, disclaimer.

## Accessibility

- Focus: solid 2px `ring` (≥ 4.5:1 intent against surfaces).
- Text size: 11px minimum.
- Primary button: dark on emerald in dark mode (`#052e1a` on `#34d399`).
- Failed chips: border + text, no tint that drops contrast below 4.5:1.

## Themes

`next-themes` sets a class on `<html>`, defaulting to system. Report frames stay white. Printing
always uses light values.
