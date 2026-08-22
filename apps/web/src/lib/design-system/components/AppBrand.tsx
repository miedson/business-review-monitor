"use client";

import { Box, Text } from "@chakra-ui/react";

interface AppBrandProps {
  size?: "sidebar" | "auth";
  showSubtitle?: boolean;
}

const sizes = {
  sidebar: { mark: 28, title: "sm", subtitle: "xs" },
  auth: { mark: 40, title: "md", subtitle: "sm" },
} as const;

export function AppBrand({ size = "sidebar", showSubtitle = true }: AppBrandProps) {
  const styles = sizes[size];
  return <Box css={{ display: "flex", alignItems: "center", gap: 2.5 }}>
    <Box aria-hidden="true" css={{ width: `${styles.mark}px`, height: `${styles.mark}px`, borderRadius: "8px", bg: "brand.600", display: "grid", placeItems: "center", flexShrink: 0 }}>
      <svg width={styles.mark - 12} height={styles.mark - 12} viewBox="0 0 20 20" fill="none"><path d="M5 3.5h5.4a3.1 3.1 0 0 1 0 6.2H5V3.5Zm0 6.2h6.2a3.4 3.4 0 0 1 0 6.8H5V9.7Z" stroke="white" strokeWidth="1.7" strokeLinejoin="round" /><path d="M7.2 6.6h3M7.2 13.1h3.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </Box>
    <Box css={{ minW: 0 }}><Text css={{ fontSize: styles.title, fontWeight: "semibold", lineHeight: "tight", color: "text.primary", whiteSpace: "nowrap" }}>Business Reputation</Text>{showSubtitle && <Text css={{ mt: .5, fontSize: styles.subtitle, color: "text.tertiary", lineHeight: "tight" }}>Hub</Text>}</Box>
  </Box>;
}
