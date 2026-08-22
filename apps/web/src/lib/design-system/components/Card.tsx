"use client";

import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@chakra-ui/react";
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
      default: {
        bg: "surface.primary",
        border: "1px solid",
        borderColor: "surface.border",
        boxShadow: "xs",
      },
      elevated: {
        bg: "surface.primary",
        border: "1px solid",
        borderColor: "surface.border",
        boxShadow: "sm",
      },
      outlined: { bg: "transparent", border: "1px solid", borderColor: "surface.borderStrong" },
      filled: { bg: "surface.secondary" },
    };

    const paddingStyles = {
      none: { p: 0 },
      sm: { p: 4 },
      md: { p: 6 },
      lg: { p: 6 },
    };

    return (
      <Card.Root
        ref={ref}
        css={{
          borderRadius: "xl",
          overflow: "hidden",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
          ...variantStyles[variant],
          ...paddingStyles[padding],
        }}
        className={className}
        {...rest}
      >
        {children}
      </Card.Root>
    );
  },
);

CardWrapper.displayName = "Card";

export { CardWrapper as Card, type CardProps };
export { CardHeader, CardBody, CardFooter, CardTitle, CardDescription };
