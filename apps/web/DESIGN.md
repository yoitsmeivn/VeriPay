# VeriPay Design System

HeroUI Pro design system `3e02c8c3-8b2e-469a-bc28-c7645cfe6c86` — glass theme, neutral base, accent `#0A3822`.

Implementation lives in `src/styles.css`. Semantic HeroUI tokens (`--accent`, `--surface`, `bg-background`, etc.) are the source of truth in product code — not raw hex values.

## Typography Override

| Role | Font | Where |
| --- | --- | --- |
| Body | DM Sans | `--font-sans`, `body`, UI copy |
| Headings | Playfair Display | `--font-display`, `h1`–`h6` |

The exported design system specifies Inter; this project deliberately keeps the DM Sans + Playfair Display pairing.

## Core Light-Mode Tokens

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#F4F5F7` | Page canvas |
| `foreground` | `#18181B` | Primary text |
| `muted` | `#6F7371` | Secondary text |
| `surface` | `oklch(100% 0 0 / 0.52)` | Frosted cards, panels |
| `accent` | `#0A3822` | Primary actions, focus |
| `accent-hover` | `#244935` | Accent hover |
| `accent-soft` | `rgba(10, 56, 34, 0.15)` | Soft emphasis |
| `accent-soft-foreground` | `#132E20` | Text on accent-soft |
| `success` | `#5EC43F` | Positive states |
| `warning` | `#FF9D3A` | Caution states |
| `danger` | `#FE3263` | Destructive states |
| `border` | `#DCDEDD` | Default borders |
| `separator` | `rgba(0, 0, 0, 0.1)` | Dividers |
| `focus` | `#0A3822` | Focus rings |
| `spacing` | `4.25px` | Base spacing unit |
| `radius` | `8px` | Global corner radius |
| `field-radius` | `12px` | Form controls |
| `glass-blur` | `48px` | Frosted glass blur (+ 200% saturation) |
| `glass-border` | `oklch(100% 0 0 / 0.55)` | Luminous glass edge |

## Components

- **Buttons:** HeroUI semantic variants — `primary` for main actions, `outline`/`ghost` for secondary, `danger` for destructive.
- **Cards:** Use HeroUI `Card` with `bg-surface`; avoid stacking extra shadows.
- **Forms:** Use HeroUI field components for consistent `--field-*` tokens.
- **Status:** `success`, `warning`, `danger` chips only for real semantic meaning.
- **Charts:** `--chart-3` aligns to accent; use `--chart-1` through `--chart-5` for series.

## Do's

- Use semantic tokens and Tailwind utilities (`bg-accent`, `text-muted`, etc.).
- Keep layouts spacious with consistent 4px/8px rhythm.
- Reserve accent for primary emphasis; use neutral surfaces for containers.
- Use Playfair Display for headings, DM Sans for everything else.

## Don'ts

- Don't copy raw hex into components when a token exists.
- Don't use accent or warning colors decoratively.
- Don't stack custom shadows on elevated HeroUI surfaces.
- Don't switch back to Inter — DM Sans + Playfair Display is intentional.
