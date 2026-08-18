"use client";

import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription } from "@chakra-ui/react";
import { forwardRef } from "react";

interface CardProps {
  variant?: "default" | "elevated" | "outlined" | "filled";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

const CardWrapper = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", children, className, ...rest }, ref) => {
    const variantStyles = {
      default: { bg: "surface.primary", border: "1px solid", borderColor: "surface.border" },
      elevated: { bg: "surface.primary", boxShadow: "md" },
      outlined: { bg: "transparent", border: "1px solid", borderColor: "surface.borderStrong" },
      filled: { bg: "surface.secondary" },
    };

    const paddingStyles = {
      none: { p: 0 },
      sm: { p: 4 },
      md: { p: 6 },
      lg: { p: 8 },
    };

    return (
      <Card.Root
        ref={ref}
        css={{ borderRadius: "xl", transition: "all 0.2s ease", ...variantStyles[variant], ...paddingStyles[padding] }}
        className={className}
        {...rest}
      >
        {children}
      </Card.Root>
    );
  }
);

CardWrapper.displayName = "Card";

export { CardWrapper as Card, type CardProps };
export { CardHeader, CardBody, CardFooter, CardTitle, CardDescription };