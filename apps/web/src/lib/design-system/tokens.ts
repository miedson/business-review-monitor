export const colors = {
  light: {
    surface: {
      primary: "#ffffff",
      secondary: "#ffffff",
      tertiary: "#f1f1f1",
      border: "#e7e7e7",
      borderStrong: "#d8d8d8",
    },
    text: {
      primary: "#181818",
      secondary: "#5f5f5f",
      tertiary: "#5f5f5f",
      quaternary: "#8a8a8a",
      inverse: "#ffffff",
      link: "#0d9488",
      linkHover: "#0f766e",
    },
    status: {
      success: {
        bg: "#f0fdf4",
        border: "#86efac",
        text: "#166534",
        icon: "#22c55e",
      },
      warning: {
        bg: "#fffbeb",
        border: "#fcd34d",
        text: "#92400e",
        icon: "#f59e0b",
      },
      error: {
        bg: "#fef2f2",
        border: "#fca5a5",
        text: "#991b1b",
        icon: "#ef4444",
      },
      info: {
        bg: "#f0fdfa",
        border: "#5eead4",
        text: "#134e4a",
        icon: "#14b8a6",
      },
    },
  },
  dark: {
    surface: {
      primary: "#121212",
      secondary: "#0b0b0b",
      tertiary: "#202020",
      border: "#292929",
      borderStrong: "#383838",
    },
    text: {
      primary: "#ededed",
      secondary: "#ababab",
      tertiary: "#ababab",
      quaternary: "#737373",
      inverse: "#ffffff",
      link: "#2dd4bf",
      linkHover: "#34d399",
    },
    status: {
      success: {
        bg: "#064e3b",
        border: "#16a34a",
        text: "#dcfce7",
        icon: "#22c55e",
      },
      warning: {
        bg: "#78350f",
        border: "#fbbf24",
        text: "#fef3c7",
        icon: "#f59e0b",
      },
      error: {
        bg: "#7f1d1d",
        border: "#f87171",
        text: "#fee2e2",
        icon: "#f87171",
      },
      info: {
        bg: "#134e4a",
        border: "#2dd4bf",
        text: "#ccfbf1",
        icon: "#14b8a6",
      },
    },
  },
  brand: {
    50: "#ecfdf3",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
  },
  green: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },
  channel: {
    google: {
      primary: "#1a73e8",
      bg: "#e8f0fe",
      text: "#1a73e8",
    },
    instagram: {
      primary: "#e1306c",
      bg: "#fce7ef",
      text: "#e1306c",
    },
    facebook: {
      primary: "#1877f2",
      bg: "#e7f0fd",
      text: "#1877f2",
    },
  },
} as const;

export const spacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  14: "3.5rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

export const borderRadius = {
  none: "0",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.625rem",
  "2xl": "0.75rem",
  full: "9999px",
} as const;

export const typography = {
  fontFamilies: {
    sans: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "0.875rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.5rem",
    "4xl": "1.875rem",
    "5xl": "2.25rem",
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeights: {
    tight: 1.1,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },
  letterSpacings: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.02em",
  },
} as const;

export const shadows = {
  none: "none",
  xs: "0 1px 2px rgb(0 0 0 / 0.03)",
  sm: "0 1px 2px rgb(0 0 0 / 0.04)",
  md: "0 2px 6px rgb(0 0 0 / 0.06)",
  lg: "0 4px 10px rgb(0 0 0 / 0.08)",
  xl: "0 8px 20px rgb(0 0 0 / 0.10)",
  "2xl": "0 12px 28px rgb(0 0 0 / 0.14)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  focus: "0 0 0 3px rgba(13, 148, 136, 0.35)",
} as const;

export const transitions = {
  fast: "150ms ease",
  normal: "200ms ease",
  slow: "300ms ease",
} as const;

export const breakpoints = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
} as const;

export const zIndices = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  tooltip: 700,
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type BorderRadiusToken = keyof typeof borderRadius;
export type ShadowToken = keyof typeof shadows;
