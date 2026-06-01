---
name: High-Contrast Noir News
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#d0c6ab'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#999077'
  outline-variant: '#4d4732'
  surface-tint: '#e9c400'
  primary: '#fff6df'
  on-primary: '#3a3000'
  primary-container: '#ffd700'
  on-primary-container: '#705e00'
  inverse-primary: '#705d00'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#f7f6f6'
  on-tertiary: '#2f3131'
  tertiary-container: '#dadada'
  on-tertiary-container: '#5e5f5f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe16d'
  primary-fixed-dim: '#e9c400'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e3e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-padding: 1.5rem
  stack-space: 1rem
  inline-gutter: 1rem
  section-gap: 2rem
  component-padding-x: 1rem
  component-padding-y: 0.75rem
---

## Brand & Style

The design system is centered on a high-contrast, editorial aesthetic tailored for deep-focus reading. By leveraging an absolute black primary background, it prioritizes OLED efficiency and reduces visual noise, allowing content to take center stage. 

The style is **High-Contrast Minimalism**. It eschews unnecessary decoration in favor of clear information hierarchy and striking visual accents. The emotional response is one of authority, clarity, and urgency—mimicking the feeling of a premium physical newspaper translated into a digital, dark-mode-first experience.

## Colors

This design system utilizes a restricted, high-impact palette to ensure maximum legibility.

- **Primary (#FFD700):** A vibrant Gold used exclusively for high-priority signals: category tags, active states, and breaking news indicators.
- **Surface Primary (#000000):** The base canvas for all screens. It provides the highest possible contrast for text.
- **Surface Secondary (#121212):** Used for elevated elements like cards, bottom sheets, and input fields to create subtle depth without breaking the dark aesthetic.
- **Text Primary (#FFFFFF):** Used for all headlines and body copy to ensure AA/AAA accessibility.
- **Text Secondary (#A0A0A0):** Reserved for metadata (by lines, timestamps, and secondary labels) to create a clear visual hierarchy.

## Typography

The design system uses **Inter** for all roles to maintain a clean, systematic feel. 

Headlines use tight letter spacing and heavy weights to command attention. Body text for news articles is set with a generous line height (1.5x or higher) to prevent eye fatigue during long-form reading. Labels for categories and timestamps use increased letter spacing and a medium-to-semibold weight to remain legible even at small scales against the dark background.

## Layout & Spacing

This design system follows a **fluid grid** approach optimized for mobile viewports. 

- **Margins:** A standard 24px (1.5rem) horizontal margin is used for all main content containers to provide breathing room and prevent text from crowding the screen edges.
- **Rhythm:** A 4px/8px baseline grid governs all internal component spacing.
- **Vertical Spacing:** 16px (1rem) is the default gap between related items in a list. Section-level breaks use 32px or more to clearly demarcate different news categories.
- **Readability:** On wider mobile or tablet screens, content width is capped at 680px and centered to maintain the ideal characters-per-line count for reading.

## Elevation & Depth

In a pure black environment, traditional soft shadows are ineffective. Instead, this design system uses **Tonal Layers** and **Low-Contrast Outlines** to communicate hierarchy:

1.  **Level 0 (Base):** #000000. Used for the main background.
2.  **Level 1 (Surface):** #121212. Used for cards and list items.
3.  **Level 2 (Interaction):** #1E1E1E. Used for pressed or hovered states.

To define edges between surfaces, a subtle 1px border (#222222) is applied to cards and containers. This ensures that even when different shades of grey sit adjacent, the structural boundaries remain crisp and clear.

## Shapes

The design system utilizes **Soft** roundedness (4px radius). 

This subtle rounding strikes a balance between the clinical precision of sharp corners and the overly casual nature of pill shapes. It conveys a modern, professional personality suitable for a news platform. Secondary elements like category chips may occasionally use `rounded-xl` (12px) to differentiate them from the primary structural cards.

## Components

### Cards & News Items
News cards use the #121212 background with a 1px #222222 border. Imagery should span the full width of the card if used, or be placed as a 80x80px square on the trailing edge for list views.

### Category Tags (Chips)
Tags use the Primary Accent (#FFD700) for text or a subtle 1px border. Backgrounds for tags should be transparent or a very low-opacity tint of the accent color to maintain high contrast with the primary text.

### Buttons
Primary buttons are solid #FFD700 with #000000 text for maximum "clickability." Secondary buttons are outlined with #FFFFFF text.

### Inputs & Search
Search bars use the Surface Secondary (#121212) color with Text Secondary (#A0A0A0) for placeholder text. The active focus state is indicated by a #FFD700 1px border.

### Progress Indicators
Reading progress indicators (often found at the top of an article) should use a slim 2px bar in #FFD700 to provide a clear sense of location without distracting from the text.