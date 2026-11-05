# Design tokens

The UI follows the DL India Terminal (https://dl-india-terminal.vercel.app). Values marked
"terminal" were read from its inline `<style>` on 2026-11-05. It ships one HTML file with no
stylesheets, Tailwind or shadcn, so everything else here is derived and says so.

The implementation is in `app/globals.css`. Components use the shadcn names in the first column.

## Colour

The terminal is dark only, so the dark column is the reference. The light theme is derived: the same
hue and hierarchy, with the accent and status colours darkened to pass contrast on light surfaces.

| shadcn token | Terminal variable | Dark | Light (derived) |
| --- | --- | --- | --- |
| `background` | `--bg` | `#0a0a0a` | `#f7f8fa` |
| `card`, `popover` | `--bg-elev` | `#1a1a1a` | `#ffffff` |
| `secondary`, `muted` | `--bg-elev-2` | `#242424` | `#eceef2` |
| `accent` (hover wash) | `--bg-hover` | `rgba(91,141,191,0.06)` | `rgba(47,97,144,0.08)` |
| `foreground` | `--text` | `#ffffff` | `#111418` |
| `dim` | `--text-dim` | `#cccccc` | `#3d4550` |
| `muted-foreground` | `--text-faint` | `#9ca3af` | `#59616d` |
| `primary`, `ring` | `--accent` | `#5b8dbf` | `#2f6190` |
| `primary-foreground` | not in terminal | `#0a0a0a` | `#ffffff` |
| `border` | `--border` | `#333333` | `#d5d9df` |
| `border-soft` | `--border-soft` | `#2a2a2a` | `#e5e7eb` |
| `input` | `--border-strong` is `#555555` | `#6f6f6f` (changed) | `#868d97` |
| `live` | `--live` | `#4ade80` | `#166534` |
| `beta` | `--beta` | `#60a5fa` | `#1d4ed8` |
| `destructive` | `--critical` | `#e05252` | `#b91c1c` |

The terminal also defines these, which nothing here uses yet: `--border-strong` `#555555`,
`--text-muted` `#666666`, `--accent-dim` `#3d6690`, `--mock` `#5b8dbf`, `--warn` `#d47848`.

## Type

Terminal stack, self-hosted through `next/font`.

| Role | Font | Used for |
| --- | --- | --- |
| `font-sans` | Inter 400 to 700 | UI and body |
| `font-mono` | JetBrains Mono 400 to 600 | labels, tickers, data, chips, codes |
| `font-display` | Playfair Display italic 600 | page titles only |

| Element | Size and style | Source |
| --- | --- | --- |
| Body | 13px / 1.5 (`text-sm`) | terminal |
| Page title | 28px / 1.2, 600, -0.015em | terminal |
| Section and card title | 15px, 600, -0.005em | terminal |
| Brand | 15px, 700, 0.01em, `◆` in the accent colour | terminal |
| App name, below the brand | 11px mono, 0.06em, muted | derived from the hero sub |
| Label (`term-label`) | 11px mono, uppercase, 0.1em | terminal uses 9px, raised |
| Hero sub and footer strip | 11px mono, 0.06em | terminal |
| Section code | 11px mono, 600, 0.14em, accent colour | terminal |

Report page titles are a ticker, so they use JetBrains Mono: capitals in Playfair italic are hard
to read. This is a deliberate change from the terminal.

## Shape and spacing

| Token | Value | Source |
| --- | --- | --- |
| Radius: cards, inputs, buttons | 4px (`--radius`) | terminal |
| Radius: chips | 2px (`rounded-sm`) | terminal |
| Radius: pills | full | terminal |
| Header height | 56px; two rows, 88px, below `sm` so the brand fits at 320px | terminal; rows derived |
| Hero padding | 28 / 32 / 20px, 16 to 20px on phones | terminal |
| Section head | 16px below, 10px inner, soft bottom border | terminal |
| Content width | 1152px (`max-w-6xl`) | derived: the terminal is full-bleed beside a sidebar |
| Card padding | 16px | terminal uses 14px; shadcn default kept |

## Components

- **Header:** sticky, `card` surface, bottom border. The brand has a right divider. Tabs have a
  medium-weight label and a 2px accent underline when active. Exchange pills sit on the right, without the
  terminal's live dots, since this app has no market status to show.
- **Hero:** gradient from `card` to `background`, bottom border, stats on the right with the value
  above its label.
- **Section head:** mono accent code, title, optional description pushed right.
- **Cards:** 1px `border`, `card` surface, a hairline `0 1px 0 rgba(26,29,36,0.03)` shadow.
- **Status chips:** mono uppercase, 2px radius, text colour with a 30% border and 8% tint. Failed has
  no tint, as it would fall below 4.5:1 in dark.
- **Footer:** `card` surface, top border, mono identifier strip, and the disclaimer.
- **Tables:** the terminal has none, so these are derived from its labels and rows: `term-label`
  headers, soft row borders, the `accent` hover wash, mono for tickers.

The sidebar, command bar and star ratings are left out: this app has two pages and nothing for
them to do.

## Accessibility

The terminal has no `:focus-visible` styles and uses a 9px label size. This app differs on purpose:

- **Focus:** a solid 2px `ring`, at least 4.98:1 against any surface. shadcn's 50% ring was too faint.
- **Input border:** `#6f6f6f`, as the terminal's `#555555` is under 3:1 on its surfaces.
- **Text size:** 11px minimum.
- **Primary button text:** dark on the accent in dark mode, as white on `#5b8dbf` is about 3.5:1.
- **`--text-muted` `#666666`:** not used for text, as it fails 4.5:1.

Measured contrast, with AA minimums of 4.5:1 for text and 3:1 for borders and focus:

| Pairing | Dark | Light |
| --- | --- | --- |
| Foreground on background | 19.80 | 17.38 |
| Muted text on card | 6.86 | 6.26 |
| Primary text on card | 4.98 | 6.49 |
| Primary button label | 5.66 | 6.49 |
| Destructive text on card | 4.56 | 6.47 |
| Done chip | 8.58 | 6.32 |
| Researching chip | 6.06 | 5.92 |
| Input border on card | 3.46 | 3.35 |
| Focus ring on card | 4.98 | 6.49 |

## Themes

`next-themes` sets a class on `<html>`, defaulting to the system setting. Its inline script runs
before first paint, which prevents the flash. Report frames stay white in both themes, because reports
bring their own light styles. Printing always uses light values.
