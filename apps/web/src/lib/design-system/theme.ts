import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { colors, spacing, borderRadius, typography, shadows } from "./tokens";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: Object.fromEntries(
          Object.entries(colors.brand).map(([key, value]) => [key, { value }])
        ),
        teal: Object.fromEntries(
          Object.entries(colors.teal).map(([key, value]) => [key, { value }])
        ),
        slate: Object.fromEntries(
          Object.entries(colors.slate).map(([key, value]) => [key, { value }])
        ),
        amber: Object.fromEntries(
          Object.entries(colors.amber).map(([key, value]) => [key, { value }])
        ),
        red: Object.fromEntries(
          Object.entries(colors.red).map(([key, value]) => [key, { value }])
        ),
        green: Object.fromEntries(
          Object.entries(colors.green).map(([key, value]) => [key, { value }])
        ),
        surface: Object.fromEntries(
          Object.entries(colors.surface).map(([key, value]) => [key, { value }])
        ),
        text: Object.fromEntries(
          Object.entries(colors.text).map(([key, value]) => [key, { value }])
        ),
        status: {
          success: Object.fromEntries(
            Object.entries(colors.status.success).map(([key, value]) => [key, { value }])
          ),
          warning: Object.fromEntries(
            Object.entries(colors.status.warning).map(([key, value]) => [key, { value }])
          ),
          error: Object.fromEntries(
            Object.entries(colors.status.error).map(([key, value]) => [key, { value }])
          ),
          info: Object.fromEntries(
            Object.entries(colors.status.info).map(([key, value]) => [key, { value }])
          ),
        },
        channel: {
          google: Object.fromEntries(
            Object.entries(colors.channel.google).map(([key, value]) => [key, { value }])
          ),
          instagram: Object.fromEntries(
            Object.entries(colors.channel.instagram).map(([key, value]) => [key, { value }])
          ),
          facebook: Object.fromEntries(
            Object.entries(colors.channel.facebook).map(([key, value]) => [key, { value }])
          ),
        },
      },
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([key, value]) => [key, { value }])
      ),
      radii: Object.fromEntries(
        Object.entries(borderRadius).map(([key, value]) => [key, { value }])
      ),
      fonts: {
        heading: { value: typography.fontFamilies.sans },
        body: { value: typography.fontFamilies.sans },
        mono: { value: typography.fontFamilies.mono },
      },
      fontSizes: Object.fromEntries(
        Object.entries(typography.fontSizes).map(([key, value]) => [key, { value }])
      ),
      fontWeights: Object.fromEntries(
        Object.entries(typography.fontWeights).map(([key, value]) => [key, { value }])
      ),
      lineHeights: Object.fromEntries(
        Object.entries(typography.lineHeights).map(([key, value]) => [key, { value }])
      ),
      letterSpacings: Object.fromEntries(
        Object.entries(typography.letterSpacings).map(([key, value]) => [key, { value }])
      ),
      shadows: Object.fromEntries(
        Object.entries(shadows).map(([key, value]) => [key, { value }])
      ),
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
        }).map(([key, value]) => [key, { value }])
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
        }).map(([key, value]) => [key, { value }])
      ),
    },
    semanticTokens: {
      colors: {
        "chakra-body-text": { value: "{colors.text.primary}" },
        "chakra-body-bg": { value: "{colors.surface.secondary}" },
        "chakra-border-color": { value: "{colors.surface.border}" },
        "chakra-placeholder-color": { value: "{colors.text.quaternary}" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
export type System = typeof system;