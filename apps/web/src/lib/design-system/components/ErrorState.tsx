"use client";

import { Box, Text, Button } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { forwardRef } from "react";

interface ErrorStateProps {
  title?: string;
  message: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "solid" | "subtle" | "surface" | "outline" | "ghost" | "plain";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: "sm" | "md" | "lg";
  tone?: "error" | "warning";
  children?: ReactNode;
  className?: string;
}

const tones = {
  error: {
    bg: "status.error.bg",
    borderColor: "status.error.border",
    iconColor: "status.error.icon",
    textColor: "status.error.text",
    colorScheme: "red",
  },
  warning: {
    bg: "status.warning.bg",
    borderColor: "status.warning.border",
    iconColor: "status.warning.icon",
    textColor: "status.warning.text",
    colorScheme: "amber",
  },
};

const sizes = {
  sm: { p: 4, gap: 3, iconSize: 32, titleSize: "md", descSize: "sm" },
  md: { p: 6, gap: 4, iconSize: 48, titleSize: "lg", descSize: "md" },
  lg: { p: 8, gap: 5, iconSize: 64, titleSize: "xl", descSize: "lg" },
};

const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title,
      message,
      icon,
      action,
      secondaryAction,
      size = "md",
      tone = "error",
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const { p, gap, iconSize, titleSize, descSize } = sizes[size];
    const toneConfig = tones[tone];

    return (
      <Box
        ref={ref}
        css={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "xl",
          border: "1px solid",
          p,
          gap,
          textAlign: "center",
          bg: toneConfig.bg,
          borderColor: toneConfig.borderColor,
        }}
        className={className}
        {...rest}
      >
        <Box css={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, w: iconSize, h: iconSize, color: toneConfig.iconColor }}>
          {icon ?? (
            <svg width={iconSize * 0.6} height={iconSize * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {tone === "error" ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </>
              ) : (
                <>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </>
              )}
            </svg>
          )}
        </Box>
        {title && <Text css={{ fontSize: titleSize, fontWeight: "semibold", color: "text.primary", lineHeight: "snug", margin: 0 }}>{title}</Text>}
        <Text css={{ fontSize: descSize, color: "text.secondary", lineHeight: "normal", margin: 0, maxWidth: "400px" }}>
          {message}
        </Text>
        {(action || secondaryAction) && (
          <Box css={{ display: "flex", alignItems: "center", gap: 3, mt: 2, flexWrap: "wrap", justifyContent: "center", width: "full" }}>
            {secondaryAction && <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
            {action && <Button variant={action.variant ?? "solid"} colorScheme={toneConfig.colorScheme} size="md" onClick={action.onClick}>{action.label}</Button>}
          </Box>
        )}
        {children}
      </Box>
    );
  }
);

ErrorState.displayName = "ErrorState";

export { ErrorState, type ErrorStateProps };