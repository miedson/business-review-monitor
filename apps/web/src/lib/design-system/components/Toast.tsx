"use client";

import { Box, Text } from "@chakra-ui/react";
import { Check, CircleAlert, X } from "lucide-react";
import { useEffect } from "react";

export type ToastTone = "success" | "error";

export type ToastProps = {
  tone: ToastTone;
  children: string;
  onClose: () => void;
  duration?: number;
};

const toneStyles = {
  success: {
    icon: Check,
    iconBackground: "#063d2a",
    iconColor: "#34d399",
    title: "Sucesso",
  },
  error: {
    icon: CircleAlert,
    iconBackground: "#4a1717",
    iconColor: "#f87171",
    title: "Erro",
  },
} as const;

export function Toast({ tone, children, onClose, duration = 5000 }: ToastProps) {
  const style = toneStyles[tone];
  const Icon = style.icon;

  useEffect(() => {
    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onClose]);

  return (
    <Box
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      css={{
        position: "fixed",
        right: { base: 4, md: 6 },
        bottom: { base: 4, md: 6 },
        zIndex: "toast",
        display: "flex",
        alignItems: "center",
        gap: 3,
        width: "min(calc(100vw - 2rem), 26rem)",
        p: 3.5,
        border: "1px solid",
        borderColor: "surface.border",
        borderRadius: "xl",
        bg: "surface.primary",
        boxShadow: "lg",
      }}
    >
      <Box
        css={{
          display: "grid",
          placeItems: "center",
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: "md",
          bg: style.iconBackground,
          color: style.iconColor,
        }}
      >
        <Icon size={16} aria-hidden="true" />
      </Box>
      <Box css={{ flex: 1, minWidth: 0 }}>
        <Text css={{ fontSize: "sm", fontWeight: "semibold", color: "text.primary" }}>
          {style.title}
        </Text>
        <Text css={{ mt: 0.5, fontSize: "xs", color: "text.secondary" }}>{children}</Text>
      </Box>
      <Box
        as="button"
        onClick={onClose}
        aria-label="Fechar notificação"
        css={{
          display: "grid",
          placeItems: "center",
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: "md",
          color: "text.tertiary",
          cursor: "pointer",
          _hover: { bg: "surface.secondary", color: "text.primary" },
          _focusVisible: { boxShadow: "focus", outline: "none" },
        }}
      >
        <X size={17} aria-hidden="true" />
      </Box>
    </Box>
  );
}
