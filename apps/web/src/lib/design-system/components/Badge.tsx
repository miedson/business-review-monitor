"use client";

import { Badge as ChakraBadge } from "@chakra-ui/react";
import { forwardRef } from "react";

interface BadgeProps {
  variant?: string;
  size?: "xs" | "sm" | "md" | "lg";
  colorScheme?: string;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantMap: Record<string, string> = {
  default: "subtle",
  success: "solid",
  warning: "solid",
  error: "solid",
  info: "solid",
  google: "solid",
  instagram: "solid",
  facebook: "solid",
};

const colorMap: Record<string, string> = {
  default: "slate",
  success: "green",
  warning: "amber",
  error: "red",
  info: "teal",
  google: "blue",
  instagram: "pink",
  facebook: "blue",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "subtle", size = "md", colorScheme, children, className, dot, ...rest }, ref) => {
    const mappedVariant = variantMap[variant] ?? "subtle";
    const mappedColorScheme = colorMap[variant] ?? colorScheme ?? "slate";

    return (
      <ChakraBadge
        ref={ref}
        variant={mappedVariant as "solid" | "subtle" | "outline" | "surface" | "plain"}
        size={size}
        colorScheme={mappedColorScheme as "slate" | "green" | "amber" | "red" | "teal" | "blue" | "pink" | "orange" | "purple" | "cyan" | "gray"}
        className={className}
        {...rest}
      >
        {dot && <span style={{ display: "inline-flex", width: "6px", height: "6px", borderRadius: "9999px", backgroundColor: "currentColor", marginRight: "6px" }} />}
        {children}
      </ChakraBadge>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, type BadgeProps };