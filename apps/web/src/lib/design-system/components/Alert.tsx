"use client";

import { Alert, AlertTitle, AlertDescription, AlertIndicator, Box, type BoxProps } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { forwardRef } from "react";

interface AlertProps extends BoxProps {
  tone?: "success" | "warning" | "error" | "info";
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
}

const toneMap = {
  success: { status: "success", variant: "subtle" },
  warning: { status: "warning", variant: "subtle" },
  error: { status: "error", variant: "subtle" },
  info: { status: "info", variant: "subtle" },
} as const;

const AlertWrapper = forwardRef<HTMLDivElement, AlertProps>(
  ({ tone = "info", title, children, onClose, dismissible, ...rest }, ref) => {
    const config = toneMap[tone];

    return (
      <Alert.Root
        ref={ref}
        status={config.status}
        variant={config.variant}
        {...rest}
      >
        <AlertIndicator />
        <Box css={{ flex: 1, minWidth: 0 }}>
          {title && <AlertTitle>{title}</AlertTitle>}
          <AlertDescription>{children}</AlertDescription>
        </Box>
        {dismissible && onClose && (
          <Box
            onClick={onClose}
            css={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              w: 8,
              h: 8,
              borderRadius: "md",
              bg: "transparent",
              border: "none",
              color: "currentColor",
              opacity: 0.6,
              cursor: "pointer",
              flexShrink: 0,
              _hover: { opacity: 1, bg: "currentColor", bgOpacity: 0.1 },
              _focusVisible: { boxShadow: "focus", outline: "none" },
            }}
            aria-label="Fechar alerta"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Box>
        )}
      </Alert.Root>
    );
  }
);

AlertWrapper.displayName = "Alert";

export { AlertWrapper as Alert, type AlertProps };