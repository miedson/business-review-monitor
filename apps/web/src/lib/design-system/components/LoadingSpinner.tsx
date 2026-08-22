"use client";

import { Box, Spinner, type BoxProps } from "@chakra-ui/react";

interface LoadingSpinnerProps extends BoxProps {
  size?: "sm" | "md" | "lg";
  color?: "brand" | "white" | "current";
}

const sizeMap = {
  sm: "sm",
  md: "md",
  lg: "lg",
} as const;

const colorMap = {
  brand: "brand",
  white: "white",
  current: "gray",
} as const;

export const LoadingSpinner = ({ size = "md", color = "brand", ...rest }: LoadingSpinnerProps) => {
  return <Spinner size={sizeMap[size]} color={colorMap[color]} {...rest} />;
};

export const SpinnerOverlay = ({
  children,
  isLoading,
  ...rest
}: { children: React.ReactNode; isLoading: boolean } & BoxProps) => {
  if (!isLoading) return <Box {...rest}>{children}</Box>;

  return (
    <Box
      css={{
        position: "relative",
        ...rest,
      }}
    >
      {children}
      <Box
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          inset: 0,
          bg: "rgba(255,255,255,0.8)",
          zIndex: "overlay",
          borderRadius: "inherit",
        }}
      >
        <LoadingSpinner size="lg" color="brand" />
      </Box>
    </Box>
  );
};
