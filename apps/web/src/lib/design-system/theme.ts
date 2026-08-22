import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

import { borderRadius, colors, shadows, spacing, typography } from "./tokens";

const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        surface: {
          primary: { value: { base: "#ffffff", _dark: "#121212" } },
          secondary: { value: { base: "#ffffff", _dark: "#0b0b0b" } },
          tertiary: { value: { base: "#f7f7f7", _dark: "#202020" } },
          border: { value: { base: "#e5e5e5", _dark: "#2a2a2a" } },
          borderStrong: { value: { base: "#d4d4d4", _dark: "#3a3a3a" } },
        },
        text: {
          primary: { value: { base: "#171717", _dark: "#ededed" } },
          secondary: { value: { base: "#666666", _dark: "#ababab" } },
          tertiary: { value: { base: "#757575", _dark: "#999999" } },
          quaternary: { value: { base: "#999999", _dark: "#727272" } },
        },
        status: {
          success: {
            bg: { value: { base: "#f4fbf6", _dark: "#13251a" } },
            border: { value: { base: "#cfe9d8", _dark: "#285438" } },
            text: { value: { base: "#1e7a42", _dark: "#78c997" } },
            icon: { value: { base: "#18a058", _dark: "#45b978" } },
          },
          warning: {
            bg: { value: { base: "#fffaf0", _dark: "#2a2110" } },
            border: { value: { base: "#eedca8", _dark: "#5b4822" } },
            text: { value: { base: "#8a620b", _dark: "#d6b45c" } },
            icon: { value: { base: "#b78113", _dark: "#d6a94a" } },
          },
          error: {
            bg: { value: { base: "#fff6f5", _dark: "#2a1514" } },
            border: { value: { base: "#f1cfca", _dark: "#5d302d" } },
            text: { value: { base: "#ad3c35", _dark: "#e0847d" } },
            icon: { value: { base: "#d14e45", _dark: "#e56e66" } },
          },
          info: {
            bg: { value: { base: "#f5f9fd", _dark: "#14202d" } },
            border: { value: { base: "#ceddeb", _dark: "#29435d" } },
            text: { value: { base: "#396b99", _dark: "#83afd7" } },
            icon: { value: { base: "#4a83b8", _dark: "#75a7dd" } },
          },
        },
      },
    },
    tokens: {
      colors: {
        brand: Object.fromEntries(
          Object.entries(colors.brand).map(([key, value]) => [key, { value }]),
        ),
        teal: Object.fromEntries(
          Object.entries(colors.teal).map(([key, value]) => [key, { value }]),
        ),
        slate: Object.fromEntries(
          Object.entries(colors.slate).map(([key, value]) => [key, { value }]),
        ),
        amber: Object.fromEntries(
          Object.entries(colors.amber).map(([key, value]) => [key, { value }]),
        ),
        red: Object.fromEntries(Object.entries(colors.red).map(([key, value]) => [key, { value }])),
        green: Object.fromEntries(
          Object.entries(colors.green).map(([key, value]) => [key, { value }]),
        ),
        channel: {
          google: Object.fromEntries(
            Object.entries(colors.channel.google).map(([key, value]) => [key, { value }]),
          ),
          instagram: Object.fromEntries(
            Object.entries(colors.channel.instagram).map(([key, value]) => [key, { value }]),
          ),
          facebook: Object.fromEntries(
            Object.entries(colors.channel.facebook).map(([key, value]) => [key, { value }]),
          ),
        },
        light: {
          canvas: { value: "#ffffff" },
          surface: {
            primary: Object.fromEntries(
              Object.entries(colors.light.surface).map(([key, value]) => [key, { value }]),
            ),
            secondary: Object.fromEntries(
              Object.entries(colors.light.surface).map(([key, value]) => [key, { value }]),
            ),
            tertiary: Object.fromEntries(
              Object.entries(colors.light.surface).map(([key, value]) => [key, { value }]),
            ),
            border: Object.fromEntries(
              Object.entries(colors.light.surface).map(([key, value]) => [key, { value }]),
            ),
          },
          text: {
            primary: Object.fromEntries(
              Object.entries(colors.light.text).map(([key, value]) => [key, { value }]),
            ),
            secondary: Object.fromEntries(
              Object.entries(colors.light.text).map(([key, value]) => [key, { value }]),
            ),
            tertiary: Object.fromEntries(
              Object.entries(colors.light.text).map(([key, value]) => [key, { value }]),
            ),
            quaternary: Object.fromEntries(
              Object.entries(colors.light.text).map(([key, value]) => [key, { value }]),
            ),
          },
        },
        dark: {
          canvas: { value: "#0f172a" },
          surface: {
            primary: Object.fromEntries(
              Object.entries(colors.dark.surface).map(([key, value]) => [key, { value }]),
            ),
            secondary: Object.fromEntries(
              Object.entries(colors.dark.surface).map(([key, value]) => [key, { value }]),
            ),
            tertiary: Object.fromEntries(
              Object.entries(colors.dark.surface).map(([key, value]) => [key, { value }]),
            ),
            border: Object.fromEntries(
              Object.entries(colors.dark.surface).map(([key, value]) => [key, { value }]),
            ),
          },
          text: {
            primary: Object.fromEntries(
              Object.entries(colors.dark.text).map(([key, value]) => [key, { value }]),
            ),
            secondary: Object.fromEntries(
              Object.entries(colors.dark.text).map(([key, value]) => [key, { value }]),
            ),
            tertiary: Object.fromEntries(
              Object.entries(colors.dark.text).map(([key, value]) => [key, { value }]),
            ),
            quaternary: Object.fromEntries(
              Object.entries(colors.dark.text).map(([key, value]) => [key, { value }]),
            ),
          },
        },
      },
      spacing: Object.fromEntries(Object.entries(spacing).map(([key, value]) => [key, { value }])),
      radii: Object.fromEntries(
        Object.entries(borderRadius).map(([key, value]) => [key, { value }]),
      ),
      fonts: {
        heading: { value: typography.fontFamilies.sans },
        body: { value: typography.fontFamilies.sans },
        mono: { value: typography.fontFamilies.mono },
      },
      fontSizes: Object.fromEntries(
        Object.entries(typography.fontSizes).map(([key, value]) => [key, { value }]),
      ),
      fontWeights: Object.fromEntries(
        Object.entries(typography.fontWeights).map(([key, value]) => [key, { value }]),
      ),
      lineHeights: Object.fromEntries(
        Object.entries(typography.lineHeights).map(([key, value]) => [key, { value }]),
      ),
      letterSpacings: Object.fromEntries(
        Object.entries(typography.letterSpacings).map(([key, value]) => [key, { value }]),
      ),
      shadows: Object.fromEntries(Object.entries(shadows).map(([key, value]) => [key, { value }])),
      durations: {
        fast: { value: "150ms" },
        normal: { value: "200ms" },
        slow: { value: "300ms" },
      },
      easings: {
        ease: { value: "ease" },
        easeIn: { value: "ease-in" },
        easeOut: { value: "ease-out" },
        easeInOut: { value: "ease-in-out" },
      },
      breakpoints: Object.fromEntries(
        Object.entries({
          sm: "40rem",
          md: "48rem",
          lg: "64rem",
          xl: "80rem",
          "2xl": "96rem",
        }).map(([key, value]) => [key, { value }]),
      ),
      zIndex: Object.fromEntries(
        Object.entries({
          hide: -1,
          base: 0,
          dropdown: 100,
          sticky: 200,
          overlay: 300,
          modal: 400,
          popover: 500,
          toast: 600,
          tooltip: 700,
        }).map(([key, value]) => [key, { value }]),
      ),
    },
  },
});

export const system = createSystem(defaultConfig, config);
export type System = typeof system;
