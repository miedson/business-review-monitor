"use client";

import { Box, Text } from "@/lib/design-system";

interface AppBrandProps {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: {
    badgeW: 8,
    badgeH: 8,
    badgeFontSize: "md",
    titleSize: "md",
    subtitleSize: "xs",
    gap: 3,
  },
  md: {
    badgeW: 10,
    badgeH: 10,
    badgeFontSize: "lg",
    titleSize: "lg",
    subtitleSize: "sm",
    gap: 3,
  },
  lg: {
    badgeW: 16,
    badgeH: 16,
    badgeFontSize: "2xl",
    titleSize: "2xl",
    subtitleSize: "sm",
    gap: 4,
  },
};

export function AppBrand({ title = "Business Reputation Hub", subtitle = "Centralize sua reputação digital", size = "md" }: AppBrandProps) {
  const styles = sizeStyles[size];

  return (
    <Box css={{ display: "flex", flexDirection: "column", alignItems: "center", gap: styles.gap, textAlign: "center" }}>
      <Box
        css={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          w: styles.badgeW,
          h: styles.badgeH,
          borderRadius: "full",
          backgroundImage: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          fontWeight: "bold",
          fontSize: styles.badgeFontSize,
          boxShadow: "lg",
          flexShrink: 0,
        }}
      >
        BRH
      </Box>
      <Box css={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Text css={{ fontWeight: "semibold", fontSize: styles.titleSize, color: "text.primary", lineHeight: "snug", margin: 0 }}>
          {title}
        </Text>
        <Text css={{ fontSize: styles.subtitleSize, color: "text.tertiary", lineHeight: "normal", margin: 0 }}>
          {subtitle}
        </Text>
      </Box>
    </Box>
  );
}
