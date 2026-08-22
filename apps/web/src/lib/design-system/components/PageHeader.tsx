"use client";

import type { ReactNode } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <Flex css={{ alignItems: { base: "flex-start", md: "flex-end" }, justifyContent: "space-between", gap: 4, flexWrap: "wrap", mb: { base: 6, md: 7 } }}>
    <Box>
      {eyebrow && <Text css={{ fontSize: "xs", textTransform: "uppercase", letterSpacing: "wide", fontWeight: "semibold", color: "text.quaternary", mb: 2 }}>{eyebrow}</Text>}
      <Text as="h1" css={{ fontSize: { base: "xl", md: "2xl" }, letterSpacing: "tight", fontWeight: "semibold", color: "text.primary", lineHeight: "tight" }}>{title}</Text>
      {description && <Text css={{ mt: 2, maxW: "680px", color: "text.tertiary", fontSize: "sm", lineHeight: "relaxed" }}>{description}</Text>}
    </Box>
    {actions && <Flex css={{ gap: 3, alignItems: "center", flexWrap: "wrap" }}>{actions}</Flex>}
  </Flex>;
}
