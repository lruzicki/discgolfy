---
name: Aether Disc
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bfc7d4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#89919d'
  outline-variant: '#404752'
  surface-tint: '#9ecaff'
  primary: '#9ecaff'
  on-primary: '#003258'
  primary-container: '#2196f3'
  on-primary-container: '#002c4f'
  inverse-primary: '#0061a4'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#00e475'
  on-tertiary: '#003918'
  tertiary-container: '#00a854'
  on-tertiary-container: '#003315'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#9ecaff'
  on-primary-fixed: '#001d36'
  on-primary-fixed-variant: '#00497d'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#62ff96'
  tertiary-fixed-dim: '#00e475'
  on-tertiary-fixed: '#00210b'
  on-tertiary-fixed-variant: '#005226'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  stat-value:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  margin-mobile: 16px
  gutter-mobile: 12px
  touch-target-min: 44px
---

## Brand & Style

The design system is centered on a "Comfy Sleek" aesthetic, specifically tailored for the active, outdoorsy nature of disc golf. It balances high-performance utility with a relaxed, approachable atmosphere. The primary emotional response is one of effortless focus—minimizing cognitive load during a round while providing a premium, data-rich experience for post-game analysis.

The style is a blend of **Minimalism** and **Modern Corporate**, utilizing heavy contrast and generous white space within a dark environment to ensure legibility under bright outdoor sunlight. Elements are substantial and tactile, favoring large interaction zones that accommodate quick taps between throws.

## Colors

This design system utilizes a deep charcoal base to reduce eye strain and provide a "comfy" backdrop. 

- **Primary Blue (#2196F3):** Reserved for high-priority actions, active states, and pathfinding.
- **Surface Tiers:** Use `#1E1E1E` for primary cards and containers to create subtle separation from the `#121212` background.
- **Functional Accents:** A tertiary Green is introduced specifically for "Birdie" or "Under Par" statistics, providing immediate emotional feedback.
- **Text:** Pure white (`#FFFFFF`) is used for primary headings, while a muted Slate (`#94A3B8`) handles secondary metadata and labels to maintain hierarchy.

## Typography

**Manrope** is selected as the primary typeface for its modern, geometric construction and exceptional legibility at various weights. Its open counters ensure that text remains readable even when the user is moving or in high-glare environments.

- **Headlines:** Use Bold and ExtraBold weights to anchor the page.
- **Data Points:** Use the `stat-value` style for scores and distances to make them the focal point of the UI.
- **Technical Labels:** **JetBrains Mono** is used for small-scale technical data (like GPS coordinates or disc flight numbers) to provide a precise, "instrument-like" feel.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a mobile-first priority. 

- **Tap Targets:** All interactive elements (buttons, steppers, list items) must maintain a minimum height of `44px` to accommodate "on-course" usage where dexterity might be limited.
- **Rhythm:** An 8px base unit drives all padding and margins. 
- **Scorecards:** Use a horizontal scrolling grid for multi-player scorecards, ensuring the "Player Name" column remains sticky on the left.
- **Safe Areas:** Maintain a `16px` outer margin on mobile devices to prevent content from hitting the screen edges.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines**.

- **Primary Level:** The main background (`#121212`).
- **Secondary Level:** Cards and containers (`#1E1E1E`). These use a subtle `1px` border of `#2C2C2C` to define edges without the need for heavy shadows.
- **Floating Elements:** Action buttons and active modals use a highly diffused, `20%` opacity black shadow with a `12px` blur to appear lifted above the map or scorecard.
- **Active State:** When an element is selected (like a hole in a list), it gains a `2px` solid stroke of the Primary Blue.

## Shapes

The shape language is consistently **Rounded**. 

- **Containers:** Standard cards and input fields use a `16px` (rounded-lg) corner radius to reinforce the "comfy" narrative.
- **Buttons:** Large action buttons use a full pill-shape (`rounded-full`) to differentiate them clearly from informational cards.
- **Data Visualizations:** Bar charts and progress bars should use rounded end-caps rather than sharp edges.

## Components

### Buttons
Primary buttons are pill-shaped, filled with Primary Blue, and use White Bold text. Secondary buttons use a Ghost style (outline only) or a subtle secondary background tint.

### Score Steppers
Used for adjusting strokes. These are large circular targets (`56x56px`) with + and - icons. The current score sits between them in a high-contrast `stat-value` font.

### Progress Cards
Course progress cards feature a thumbnail map on the left and primary stats (Par, Distance, Hole #) on the right. The background is a solid `#1E1E1E` to contrast against the global background.

### Data Visualizations
Line graphs for performance history should use thick, `3pt` lines with circular data points. Use a vertical gradient fill (Primary Blue to transparent) beneath the line to provide volume.

### Map Markers
The "Tee" and "Basket" markers are circular with high-contrast icons. The current disc position is indicated by a Primary Blue pulsing ring to denote GPS accuracy.