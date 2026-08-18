"use client";

import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from "@chakra-ui/react";
import { forwardRef } from "react";

interface ButtonProps extends Omit<ChakraButtonProps, "loading"> {
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      size = "md",
      loading,
      fullWidth,
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <ChakraButton
        ref={ref}
        type={type}
        variant={variant}
        size={size}
        disabled={isDisabled}
        loading={loading}
        w={fullWidth ? "full" : undefined}
        {...rest}
      >
        {children}
      </ChakraButton>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps };