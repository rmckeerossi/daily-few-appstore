# Daily Few app: production handoff

Solo reflection app. Users pull question cards from themed decks, answer privately (text, voice, photos), and look back month by month. The product source of truth is the PRD (Sep 26, 2026). This package is the source of truth for visuals and layout.

## What's in this zip

| Path | What it is |
|---|---|
| `LAYOUT.md` | Screen-by-screen layout spec with measurements, components, states and behavior. **Start here.** |
| `tokens/tokens.json` | All design tokens: colour, type, spacing, radius, shadow, motion, plus the app's dark-theme values. |
| `tokens/*.css` | The same tokens as CSS custom properties (the brand design system). |
| `fonts/` | Self-hosted WOFF2 fonts plus `fonts.css` with `@font-face` rules. |
| `assets/` | Logo and submark PNGs (white and burgundy). |
| `screens/` | 2x PNG reference of each screen, above the fold (780×1688 = 390×844 @2x). |
| `prototype/Daily Few App (offline).html` | Fully interactive prototype. Open it in a browser, no internet needed. The reference for all flows and states. |
| `source/Daily Few App.dc.html` | Prototype source: markup plus logic. Only readable, not runnable, outside the design tool. Use it to look up exact inline values. |

## Fonts: important

No licensed brand fonts have been supplied yet. These open-source stand-ins are included (all SIL Open Font License, free for commercial apps):

- **Cormorant Garamond**: display and headlines (Light 300, Regular 400, plus italics)
- **Jost**: UI and body (300, 400, 500)
- **IBM Plex Mono**: labels, dates, counts (400, 500)

The files are variable WOFF2, Latin subset. Swap them for the licensed brand faces once they arrive; the type scale doesn't change.

## Icons

Lucide (https://lucide.dev), outline only, **1.5px stroke**, sized 14/16/18/20/22. The full list of icons used is in `LAYOUT.md` §Icons. There are no filled icons and no emoji anywhere.

## Placeholder content (don't ship as-is)

These are stand-ins: seasons of life, deck names (The quiet turn, Late light, First pages), every question, sample answers and dates, and photos. The "days reflected" ring on home depends on the PRD's open question about personal stats.
