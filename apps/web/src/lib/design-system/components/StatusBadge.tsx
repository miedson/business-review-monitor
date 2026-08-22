"use client";

import { Box, Text } from "@chakra-ui/react";
import type React from "react";

export function StatusBadge({ status, children }: { status: "connected" | "disconnected" | "attention" | "new" | "comingSoon" | "error" | "success" | "warning"; children?: React.ReactNode }) {
  const map = {
    connected: ["Conectado", "#e9f8ef", "#197544"], disconnected: ["Desconectado", "surface.tertiary", "text.tertiary"],
    attention: ["Atenção", "#fff6df", "#a05a00"], new: ["Novo", "#e9f8ef", "#197544"],
    comingSoon: ["Em breve", "#f5f1e8", "#8a6a25"], error: ["Erro", "#fff0ef", "#c13b34"],
  } as const;
  const [label, bg, color] = map[status === "success" ? "connected" : status === "warning" ? "attention" : status];
  return <Box css={{ display: "inline-flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1, borderRadius: "full", bg, color, fontSize: "xs", fontWeight: "semibold", whiteSpace: "nowrap" }}><Box css={{ w: 1.5, h: 1.5, borderRadius: "full", bg: "currentColor" }} /><Text>{children ?? label}</Text></Box>;
}
