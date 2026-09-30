// Design tokens from design/tokens/tokens.json (the Claude Design export).
// Values are iOS points, which match the export's CSS px.

export const colors = {
  burgundy: '#4C1C31',
  burgundy600: '#6B2743',
  burgundy500: '#8A365A',
  burgundy800: '#3A1526',
  night: '#280E1A',
  cream: '#F4F0DC',
  cream300: '#E7E1C6',
  cream500: '#A9A288',
  paleCream: '#FEFCF2',
  lilac: '#D1DBFF',
  // Accent for happy moments only (period days, this month's deck). Never for
  // errors, buttons or small text.
  red: '#EF3C3F',
  gradientStart: '#531832',
  gradientEnd: '#8A365A',
  error: '#9B2C2C',
  errorOnDark: '#F2B8C6',

  textPrimary: '#FEFCF2',
  textSecondary: 'rgba(254,252,242,0.72)',
  textLabel: 'rgba(254,252,242,0.66)',
  textTertiary: 'rgba(254,252,242,0.60)',
  surface: 'rgba(254,252,242,0.04)',
  surfaceHover: 'rgba(254,252,242,0.08)',
  surfaceBorder: 'rgba(254,252,242,0.14)',
  outlineBorder: 'rgba(254,252,242,0.28)',
  divider: 'rgba(254,252,242,0.10)',
  lilacTint: 'rgba(209,219,255,0.12)',
  segmentedTrack: 'rgba(209,219,255,0.10)',
  inputBg: 'rgba(254,252,242,0.06)',
  inputBorder: 'rgba(254,252,242,0.18)',
} as const;

// Font family names registered in src/app/_layout.tsx.
// Brand faces (the "Stencil Tweaks" in the web version): Ivar Display
// Condensed Medium for display, Neue Haas Grotesk Display for UI and body.
// The design export's light/regular display weights both map to Ivar Medium,
// the only cut licensed. IBM Plex Mono stays for labels.
export const fonts = {
  displayLight: 'IvarDisplayCondensed-Medium',
  displayLightItalic: 'IvarDisplay-MediumItalic',
  display: 'IvarDisplayCondensed-Medium',
  displayItalic: 'IvarDisplay-MediumItalic',
  sansLight: 'NHaasGroteskDSPro-55Rg',
  sans: 'NHaasGroteskDSPro-55Rg',
  sansMedium: 'NHaasGroteskDSPro-65Md',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

const em = (size: number, value: number) => size * value;

// Type scale: size / line height / family / tracking.
export const type = {
  displayHero: { fontFamily: fonts.displayLight, fontSize: 64, lineHeight: 63, letterSpacing: em(64, -0.02) },
  displayL: { fontFamily: fonts.displayLight, fontSize: 44, lineHeight: 46, letterSpacing: em(44, -0.02) },
  screenTitle: { fontFamily: fonts.displayLight, fontSize: 38, lineHeight: 40, letterSpacing: em(38, -0.02) },
  greeting: { fontFamily: fonts.displayLight, fontSize: 34, lineHeight: 37, letterSpacing: em(34, -0.02) },
  cardQuestion: { fontFamily: fonts.displayLight, fontSize: 32, lineHeight: 36, letterSpacing: em(32, -0.01) },
  sheetTitle: { fontFamily: fonts.displayLight, fontSize: 30, lineHeight: 33 },
  deckName: { fontFamily: fonts.displayLight, fontSize: 25, lineHeight: 28 },
  categoryName: { fontFamily: fonts.display, fontSize: 23, lineHeight: 25 },
  listQuestion: { fontFamily: fonts.display, fontSize: 19, lineHeight: 23 },
  bodyLg: { fontFamily: fonts.sansLight, fontSize: 18, lineHeight: 29 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24 },
  bodyLight: { fontFamily: fonts.sansLight, fontSize: 15, lineHeight: 24 },
  bodySm: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  button: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: em(12, 0.04), textTransform: 'uppercase' },
  buttonLg: { fontFamily: fonts.sansMedium, fontSize: 14, letterSpacing: em(14, 0.04), textTransform: 'uppercase' },
  label: { fontFamily: fonts.monoMedium, fontSize: 10.5, lineHeight: 13, letterSpacing: em(10.5, 0.16), textTransform: 'uppercase' },
  labelSm: { fontFamily: fonts.monoMedium, fontSize: 10, lineHeight: 12, letterSpacing: em(10, 0.16), textTransform: 'uppercase' },
  data: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 13 },
} as const;

export const space = { gutter: 22, signupGutter: 24, section: 28 } as const;

export const radius = {
  chip: 4,
  input: 8,
  row: 16,
  category: 18,
  card: 20,
  deckTile: 22,
  questionCard: 24,
  sheet: 28,
  pill: 999,
} as const;

export const motion = { fast: 160, base: 240, slow: 420 } as const;
