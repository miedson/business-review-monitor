"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  icon,
  detail,
  tone = "brand",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  detail?: string;
  tone?: "brand" | "warning" | "neutral" | "instagram";
}) {
  const tones = {
    brand: { bg: "brand.50", color: "brand.700" },
    warning: { bg: "amber.50", color: "amber.700" },
    neutral: { bg: "surface.tertiary", color: "text.secondary" },
    instagram: { bg: "#fce7ef", color: "#c13584" },
  };
  const style = tones[tone];
  return (
    <Box
      css={{
        bg: "surface.primary",
        border: "1px solid",
        borderColor: "surface.border",
        borderRadius: "2xl",
        p: 5,
        boxShadow: "xs",
        minW: 0,
      }}
    >
      <Flex css={{ justifyContent: "space-between", alignItems: "flex-start", gap: 3 }}>
        <Text css={{ fontSize: "sm", color: "text.tertiary", fontWeight: "medium" }}>{label}</Text>
        <Box
          css={{
            display: "grid",
            placeItems: "center",
            w: 9,
            h: 9,
            borderRadius: "xl",
            bg: style.bg,
            color: style.color,
          }}
        >
          {icon}
        </Box>
      </Flex>
      <Text
        css={{
          mt: 5,
          fontSize: "3xl",
          fontWeight: "bold",
          letterSpacing: "tight",
          lineHeight: "tight",
          color: "text.primary",
        }}
      >
        {value}
      </Text>
      {detail && <Text css={{ mt: 2, fontSize: "xs", color: "text.tertiary" }}>{detail}</Text>}
    </Box>
  );
}
