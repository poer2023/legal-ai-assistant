# UI Style Rules

## 1. Design Keywords
- **Professional**: Clean, trustworthy, authority (Legal context).
- **Modern**: Smooth gradients, subtle shadows, rounded corners (8px-12px).
- **Efficient**: Clear hierarchy, distinct actions.
- **Airy**: Ample whitespace, avoiding clutter.

## 2. Colors & Palette
### Primary (Blue)
- **Main**: `#2563eb` (Blue 600) - Primary buttons, active states, links.
- **Hover**: `#1d4ed8` (Blue 700) - Hover states.
- **Surface**: `#eff6ff` (Blue 50) - Backgrounds for active items, selected states.

### Neutral (Slate/Gray)
- **Text Primary**: `#1e293b` (Slate 800) - Headings, main text.
- **Text Secondary**: `#64748b` (Slate 500) - Subtitles, descriptions, placeholders.
- **Border**: `#e2e8f0` (Slate 200) - Dividers, card borders.
- **Background**: `#f8fafc` (Slate 50) - Page background.
- **White**: `#ffffff` - Card backgrounds.

### Semantic
- **Success**: `#22c55e` (Green 500)
- **Warning**: `#f59e0b` (Amber 500)
- **Error**: `#ef4444` (Red 500)

## 3. Typography
- **Font Family**: System default sans-serif (Inter, -apple-system, BlinkMacSystemFont, etc.).
- **Headings**:
  - H1: 28px-32px, Bold (700).
  - H2: 24px, SemiBold (600).
  - H3: 18px-20px, Medium (500).
- **Body**: 14px-16px, Regular (400).
- **Caption**: 12px, Regular (400).

## 4. Spacing & Grid
- **Base Unit**: 4px.
- **Common Spacings**:
  - Tiny: 4px
  - Small: 8px, 12px
  - Medium: 16px, 24px
  - Large: 32px, 48px, 64px
- **Container Max Width**: 800px - 1000px for centered content.

## 5. Components

### Cards & Containers
- **Background**: White.
- **Border Radius**: 12px (Standard), 16px (Large).
- **Shadow**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` (Tailwind `shadow-md` equivalent or custom subtle shadow).

### Buttons
- **Primary**: Blue background, White text, 8px radius.
- **Secondary/Ghost**: Transparent/Light background, Blue/Slate text.
- **Height**: 40px (Medium), 48px (Large).

### Inputs
- **Style**: No border (shadow-based) or subtle border (`#e2e8f0`).
- **Focus**: Blue ring/border.
- **Radius**: 8px or Full (Pill shape for search).

## 6. Layout Specifics (Legal Search)
- **Hero Alignment**: Center-weighted, approx 30-40% from top (visual center).
- **Search Bar**: Prominent, high contrast against background.
- **Tabs**: minimalist, underline or pill style.
