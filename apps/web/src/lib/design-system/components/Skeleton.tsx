"use client";

import { Skeleton as ChakraSkeleton, Box } from "@chakra-ui/react";
import { forwardRef } from "react";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  count?: number;
  spacing?: number;
  className?: string;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = "text", width, height, count = 1, spacing = 3, className, ...rest }, ref) => {
    const skeletons = Array.from({ length: count }, (_, i) => (
      <ChakraSkeleton
        key={i}
        ref={i === 0 ? ref : undefined}
        css={{
          width,
          height,
          borderRadius: variant === "circular" ? "full" : variant === "text" ? "full" : "md",
          minH: variant === "text" ? "1rem" : variant === "card" ? "200px" : undefined,
          maxW: variant === "text" ? "full" : undefined,
        }}
        {...rest}
      />
    ));

    return (
      <Box css={{ display: "flex", flexDirection: "column", width: "full", gap: spacing }} className={className}>
        {skeletons}
      </Box>
    );
  }
);

Skeleton.displayName = "Skeleton";

export { Skeleton, type SkeletonProps };