# Happycapy — Style Reference
> Warm paper desktop, illustrated and agent-native

**Theme:** light

Happycapy presents a soft paper-colored canvas rather than a conventional SaaS surface. The dominant feeling is editorial and handmade: off-white backgrounds, black ink linework, and serif headlines give the page the tone of an illustrated field guide for software. `Instrument Serif` carries the brand voice in large display headings, with italic words used as deliberate rhythm breaks instead of decorative afterthoughts. The utility layer is quieter and more modern: system sans navigation, compact gray links, and pill-shaped black CTAs keep the page usable without competing with the artwork. Color is mostly restrained, but the orange accent appears with high intent for product-name emphasis and warm illustrated panels. Depth is shallow and graphic: rounded media frames, one-pixel black borders, blurred sticky navigation, and image-driven atmosphere replace heavy UI shadows. The distinctive signature is the contrast between agent/computer subject matter and hand-drawn capybara, bird, cloud, and retro desktop illustrations.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Paper Canvas | `#f9f6f1` | `--color-canvas` | Primary page background and header backdrop |
| Warm Paper | `#fdfbf7` | `--color-paper` | Lighter editorial panel background and paper-like surfaces |
| Ink | `#2b2b2b` | `--color-ink` | Primary body and serif headline text in the light theme |
| Deep Ink | `#000000` | `--color-deep-ink` | Primary CTA fill, strong borders, logo artwork, play icon |
| Slate Text | `#374151` | `--color-slate-text` | Default public page text and navigation links |
| Muted Slate | `#4b5563` | `--color-muted-slate` | Hero support text, explanatory copy, secondary body text |
| Soft Gray | `#d2d0cd` | `--color-soft-gray` | Observed anti-aliased ink and low-contrast illustrative gray |
| Border Wash | `#e9e4dc` | `--color-border-wash` | Default subtle borders from `hsl(40 10% 91%)` |
| Accent Orange | `#ff6b4a` | `--color-accent-orange` | Product-name emphasis and key warm accent |
| Link Orange | `#ff6b35` | `--color-link-orange` | Public content links |
| Peach Panel | `#f8b070` | `--color-peach-panel` | Dominant warm illustration/video cover area sampled from the homepage screenshot |
| Peach Tint | `#f7e6d6` | `--color-peach-tint` | Soft warm highlight inside illustrated panels |
| Sky Blue | `#679bbf` | `--color-sky-blue` | Small illustration color accent in product/artwork cards |
| Deep Surface | `#121212` | `--color-dark-canvas` | Dark theme page background |
| Dark Surface | `#171717` | `--color-dark-surface` | Dark theme public container background |
| Dark Ink | `#f3f4f6` | `--color-dark-ink` | Primary text on dark theme surfaces |

### Decorative / Gradient

| Name | Value | Token | Role |
|------|-------|-------|------|
| Video Peach Field | `linear-gradient(180deg, #f8b070 0%, #f7e6d6 54%, #f9f6f1 100%)` | `--gradient-video-peach` | Warm atmospheric field behind the landing video cover |
| Paper Fade | `linear-gradient(180deg, #f9f6f1 0%, #fdfbf7 100%)` | `--gradient-paper-fade` | Quiet page-to-panel transition |
| Animated Border Spectrum | `conic-gradient(#f97316 0deg, #eab308 60deg, #22c55e 120deg, #3b82f6 180deg, #8b5cf6 240deg, #ec4899 300deg, #f97316 360deg)` | `--gradient-spectrum-ring` | Existing animated pill border utility; use sparingly for agent/tool affordances |

## Tokens — Typography

### Instrument Serif — expressive editorial display face · `--font-display`
- **Substitute:** Cormorant Garamond or Libre Baskerville
- **Weights:** 400
- **Sizes:** 36px, 48px, 60px, 72px, 88px, 96px
- **Line height:** 1.0, 1.1
- **Letter spacing:** `0` for display utilities, `-0.025em` where Tailwind `tracking-tight` is applied
- **OpenType features:** Standard serif italics; no custom feature flags observed
- **Role:** Hero headings, section titles, numbered feature markers, oversized editorial statements, and italic emphasis words such as `agent-native`, `everyone`, and `Happycapy`.

### System Sans — quiet UI and body text · `--font-sans`
- **Substitute:** Inter
- **Weights:** 400, 500, 600, 700
- **Sizes:** 12px, 14px, 16px, 18px, 20px
- **Line height:** 1.25, 1.5, 1.6, 1.625, 1.75
- **Letter spacing:** `0` for body; `0.1em` for uppercase footer labels
- **OpenType features:** Browser defaults
- **Role:** Navigation, CTA labels, paragraphs, footer columns, support copy, and regular product UI text.

### Courier New — lightweight content code accent · `--font-mono`
- **Substitute:** ui-monospace, SFMono-Regular, Menlo
- **Weights:** 400
- **Sizes:** 14px
- **Line height:** 1.6
- **Letter spacing:** 0
- **Role:** Inline code blocks inside public content pages; not a primary landing-page voice.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| display-xl | 96px | 1.0 | 0 | `--text-display-xl` |
| display-lg | 72px | 1.1 | -0.025em | `--text-display-lg` |
| display-md | 60px | 1.0 | 0 | `--text-display-md` |
| title | 48px | 1.1 | 0 | `--text-title` |
| section | 36px | 1.1 | 0 | `--text-section` |
| feature-title | 30px | 1.1 | -0.025em | `--text-feature-title` |
| body-lg | 18px | 1.625 | 0 | `--text-body-lg` |
| body | 16px | 1.6 | 0 | `--text-body` |
| nav | 14px | 1.25 | 0 | `--text-nav` |
| label | 12px | 1.5 | 0.1em | `--text-label` |

## Tokens — Spacing & Shapes

**Density:** generous editorial spacing with compact controls.

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 6 | 6px | `--spacing-6` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |
| 96 | 96px | `--spacing-96` |
| 120 | 120px | `--spacing-120` |
| 144 | 144px | `--spacing-144` |
| 176 | 176px | `--spacing-176` |

### Border Radius

| Name | Value | Token |
|------|-------|-------|
| sm | 4px | `--radius-sm` |
| md | 10px | `--radius-md` |
| lg | 16px | `--radius-lg` |
| xl | 24px | `--radius-xl` |
| xxl | 32px | `--radius-xxl` |
| pill | 9999px | `--radius-pill` |

| Element | Value |
|---------|-------|
| CTAs | 9999px |
| media panels | 24px to 32px |
| content code | 4px |
| browser/demo windows | 8px to 16px |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| header-blur | `0 1px 0 rgba(0,0,0,0.04)` | `--shadow-header-blur` |
| play-button | `0 25px 50px -12px rgba(0,0,0,0.25)` | `--shadow-play-button` |
| soft-card | `0 18px 44px rgba(43,43,43,0.08)` | `--shadow-soft-card` |

### Layout

- **Section gap:** 96px to 128px.
- **Hero top padding:** 144px desktop, 112px mobile.
- **Header height:** 64px.
- **Content max width:** 1280px (`max-w-7xl`).
- **Narrow content width:** 896px (`max-w-4xl` / `public-section-sm` pattern).
- **Card padding:** 24px to 32px.
- **Element gap:** 16px to 48px.

## Components

### Sticky Public Navigation
**Role:** Global navigation and brand anchor.

`height=64px`, `background=rgba(249,246,241,0.8)`, `backdrop-filter=blur(12px)`, `border-bottom=1px solid rgba(233,228,220,0.5)`, `max-width=1280px`, `padding-inline=24px`. The wordmark uses the hand-drawn capybara logo plus lower-case serif-ish mark artwork; links use 14px medium system sans at 70% opacity with opacity increase on hover.

### Primary CTA
**Role:** Main conversion action.

`background=#000000`, `color=#ffffff`, `border-radius=9999px`, `height=56px`, `padding=0 40px`, `font-size=16px`, `font-weight=500`. Header variant uses `height=40px`, `padding=0 16px`, and a 14px label. Hover state darkens through `bg-primary/90`; dark mode flips to transparent with a white border and `rgba(255,255,255,0.1)` hover fill.

### Orange Text Accent
**Role:** Sparse semantic emphasis.

`color=#ff6b4a`, `font-weight=500`, used inline in support copy for names such as `OpenClaw`. Do not use it as a large fill color for primary UI unless it is part of an illustration panel.

### Hero Editorial Block
**Role:** First-view brand statement.

Two-column desktop grid, `5fr / 7fr`, with centered mobile alignment and left-aligned desktop text. H1 uses `Instrument Serif`, 48px to 72px, `line-height=1.1`, `tracking=-0.025em`; italic spans remain inline and should not be recolored. The support line below uses the same display face at 24px to 36px with muted gray.

### Rounded Media Frame
**Role:** Product screenshot, video, or illustrated demo container.

`border-radius=24px` or `32px`, `overflow=hidden`, usually no shadow. Large video cover uses `border=1px solid #000000`, preserving the drawn poster quality instead of a glossy SaaS card.

### Feature Step Row
**Role:** Explaining sequenced capabilities.

Each row is a text-left button with `display:flex`, `gap=32px`, and an `Instrument Serif` number at 30px. Active row uses `#ff6b4a` for the number and black/white for the title; inactive rows drop into gray text (`#d1d5db`, `#6b7280`, `#9ca3af`). This component should feel like a table of contents, not a tab bar.

### Footer Column
**Role:** Low-emphasis resource navigation.

Uppercase labels use 12px bold system sans, `letter-spacing=0.1em`, and 40% opacity. Links are 14px at 60% opacity, increasing on hover. The footer repeats the logo and keeps the same paper background, so it closes the page without introducing a new color field.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper Canvas | `#f9f6f1` | Base page and header surface |
| 1 | Warm Paper | `#fdfbf7` | Editorial panels and paper-like cards |
| 2 | White Card | `#ffffff` | Conventional app/card surfaces in secondary pages |
| 3 | Black Ink | `#000000` | Primary CTA, strong border, active icon fill |
| 4 | Dark Canvas | `#121212` | Full dark-mode base |

## Do's and Don'ts

### Do
- Use `--color-canvas` (`#f9f6f1`) as the default background for public pages.
- Use `--font-display` for major marketing headlines and keep italic words as the rhythm break.
- Reserve `--color-deep-ink` for primary CTA fills, play icons, logo linework, and strong media borders.
- Use `--color-accent-orange` only for important inline emphasis or small active markers.
- Keep media containers large, rounded, and image-led; the page relies on illustration density for personality.
- Use 96px or larger section gaps so the editorial rhythm has room to breathe.
- Let system sans handle navigation, body copy, footer links, and functional labels.
- Prefer one-pixel black borders on hero/video frames over soft gray SaaS card chrome.

### Don't
- Do not replace the paper canvas with pure white; it removes the handmade warmth.
- Do not turn orange into the primary button color; black CTAs are the conversion anchor.
- Do not use geometric sans display headings where `Instrument Serif` is expected.
- Do not add heavy drop shadows around the hero artwork; it should feel printed or drawn, not floating.
- Do not make dense dashboard grids on the public landing style; use large editorial blocks and generous section spacing.
- Do not recolor the capybara/retro illustration language into a generic blue-purple AI gradient.
- Do not overuse rounded cards; the brand's stronger repeated shapes are pill CTAs and rounded media frames.
- Do not mix dark-mode tokens into the light style guide unless documenting a separate dark variant.

## Imagery

Happycapy imagery combines black ink illustration, capybara characters, birds, clouds, retro desktop objects, and warm product collages. The artwork looks hand-drawn and lightly absurd rather than polished corporate 3D. Color is used inside the illustrations: warm peach fields, flower-like color blocks, a blue/yellow canvas painting, and old-computer screen details. Product media should be framed as an illustrated scene or browser-native artifact rather than as a generic screenshot floating in a glass card. The visual density can be high inside media panels, but surrounding layout should stay quiet and paper-like.

## Layout

The public homepage uses a sticky 64px header, then a generous hero with a two-column grid: editorial copy on the left and oversized illustration/media on the right. Content is constrained to `max-width: 1280px` with 24px side padding. Sections alternate between centered serif statements and two-column text/media compositions. The layout relies on vertical rhythm rather than card grids, with gaps from 96px to 128px between major sections. Mobile collapses to centered text and stacked media while retaining large serif headings and pill actions.

## Agent Prompt Guide

1. Create a Happycapy-style hero: `#f9f6f1` background, `Instrument Serif` 72px heading with one italic phrase, muted slate support text, black pill CTA at 56px height, and a large rounded hand-drawn product illustration on the right.
2. Create a feature section: centered `Instrument Serif` 60px heading, body text in system sans `#4b5563`, then a two-column block with rounded media on one side and four step rows using 30px serif numbers; active number is `#ff6b4a`.
3. Create a media card: 1px `#000000` border, 24px radius, no heavy shadow, warm peach field `#f8b070`, black ink linework, small blue/yellow accents, and a centered white circular play button with `0 25px 50px -12px rgba(0,0,0,0.25)`.

## Similar Brands

- **Read.cv** — Similar editorial restraint, warm neutral space, and type-led composition.
- **Basecamp** — Shares an approachable, non-corporate product voice with hand-drawn illustration.
- **Mimestream** — Similar lightweight product clarity and restrained UI chrome.
- **Notion Calendar landing pages** — Similar quiet surfaces and controlled typographic hierarchy, though Happycapy is warmer and more illustrated.
- **Raycast** — Similar agent/productivity positioning, but Happycapy rejects the dark neon developer-tool look in favor of paper and drawing.

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-canvas: #f9f6f1;
  --color-paper: #fdfbf7;
  --color-ink: #2b2b2b;
  --color-deep-ink: #000000;
  --color-slate-text: #374151;
  --color-muted-slate: #4b5563;
  --color-soft-gray: #d2d0cd;
  --color-border-wash: #e9e4dc;
  --color-accent-orange: #ff6b4a;
  --color-link-orange: #ff6b35;
  --color-peach-panel: #f8b070;
  --color-peach-tint: #f7e6d6;
  --color-sky-blue: #679bbf;
  --color-dark-canvas: #121212;
  --color-dark-surface: #171717;
  --color-dark-ink: #f3f4f6;

  /* Typography */
  --font-display: "Instrument Serif", Georgia, "Times New Roman", serif;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Courier New", ui-monospace, monospace;

  --text-display-xl: 96px;
  --text-display-lg: 72px;
  --text-display-md: 60px;
  --text-title: 48px;
  --text-section: 36px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --leading-display: 1.1;
  --leading-body: 1.6;
  --tracking-tight: -0.025em;

  /* Spacing */
  --spacing-24: 24px;
  --spacing-48: 48px;
  --spacing-80: 80px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* Radius */
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-xxl: 32px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-header-blur: 0 1px 0 rgba(0,0,0,0.04);
  --shadow-play-button: 0 25px 50px -12px rgba(0,0,0,0.25);
  --shadow-soft-card: 0 18px 44px rgba(43,43,43,0.08);
}
```

### Tailwind v4

```css
@theme {
  --color-canvas: #f9f6f1;
  --color-paper: #fdfbf7;
  --color-ink: #2b2b2b;
  --color-deep-ink: #000000;
  --color-muted-slate: #4b5563;
  --color-accent-orange: #ff6b4a;
  --color-peach-panel: #f8b070;
  --font-display: "Instrument Serif", serif;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --radius-pill: 9999px;
}
```
