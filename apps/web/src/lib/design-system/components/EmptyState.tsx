"use client";

import { Box, Text, Button } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { forwardRef } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
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
  children?: ReactNode;
  className?: string;
}

const sizes = {
  sm: { p: 6, gap: 3, iconSize: 40, titleSize: "lg", descSize: "sm" },
  md: { p: 8, gap: 4, iconSize: 56, titleSize: "xl", descSize: "md" },
  lg: { p: 12, gap: 5, iconSize: 72, titleSize: "2xl", descSize: "lg" },
};

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      title,
      description,
      icon,
      action,
      secondaryAction,
      size = "md",
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const { p, gap, iconSize, titleSize, descSize } = sizes[size];

    return (
      <Box
        ref={ref}
        css={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "xl",
          bg: "surface.primary",
          border: "1px solid",
          borderColor: "surface.border",
          p,
          gap,
          textAlign: "center",
        }}
        className={className}
        {...rest}
      >
        {icon ? (
          <Box css={{ display: "flex", alignItems: "center", justifyContent: "center", color: "text.quaternary", flexShrink: 0, w: iconSize, h: iconSize, fontSize: iconSize / 2 }}>
            {icon}
          </Box>
        ) : (
          <Box css={{ display: "flex", alignItems: "center", justifyContent: "center", color: "text.quaternary", bg: "surface.tertiary", borderRadius: "full", flexShrink: 0, w: iconSize, h: iconSize }}>
            <svg width={iconSize * 0.5} height={iconSize * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </Box>
        )}
        <Text css={{ fontSize: titleSize, fontWeight: "semibold", color: "text.primary", lineHeight: "snug", margin: 0 }}>
          {title}
        </Text>
        {description && (
          <Text css={{ fontSize: descSize, color: "text.tertiary", lineHeight: "normal", margin: 0, maxWidth: "400px" }}>
            {description}
          </Text>
        )}
        {(action || secondaryAction) && (
          <Box css={{ display: "flex", alignItems: "center", gap: 3, mt: 2, flexWrap: "wrap", justifyContent: "center", width: "full" }}>
            {secondaryAction && <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
            {action && <Button variant={action.variant ?? "solid"} size="md" onClick={action.onClick}>{action.label}</Button>}
          </Box>
        )}
        {children}
      </Box>
    );
  }
);

EmptyState.displayName = "EmptyState";

export { EmptyState, type EmptyStateProps };