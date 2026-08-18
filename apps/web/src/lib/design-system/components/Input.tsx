"use client";

import { Input as ChakraInput, Text, Field, Box, type InputProps as ChakraInputProps } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { forwardRef, useId, useState } from "react";

type InputType = "text" | "email" | "password" | "number" | "tel" | "url" | "search";

interface InputProps extends Omit<ChakraInputProps, "type"> {
  type?: InputType;
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  showPasswordToggle?: boolean;
}

const InputWrapper = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      showPasswordToggle,
      id: providedId,
      required,
      disabled,
      type: providedType,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = providedType === "password";

    const handleTogglePassword = () => {
      setShowPassword((prev) => !prev);
    };

    const inputType: InputType = isPassword && !showPassword ? "password" : (providedType ?? "text");

    const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(" ") || undefined;

    return (
      <Field.Root disabled={disabled}>
        {label && (
          <Field.Label htmlFor={id} css={{ fontSize: "sm", fontWeight: "medium", color: "text.secondary", mb: 1.5, display: "block" }}>
            {label}
            {required && <span style={{ color: "var(--colors-status-error-icon)", marginLeft: "0.25rem" }}>*</span>}
          </Field.Label>
        )}
        <Box
          css={{
            display: "flex",
            alignItems: "center",
            bg: "surface.primary",
            border: "1px solid",
            borderColor: error ? "status.error.border" : "surface.border",
            borderRadius: "md",
            transition: "all 0.15s ease",
            position: "relative",
            _focusWithin: {
              borderColor: error ? "status.error.border" : "brand.500",
              boxShadow: error ? "0 0 0 2px {colors.status.error.icon}.300" : "0 0 0 2px {colors.brand.500}.300",
            },
            _hover: {
              borderColor: error ? "status.error.border" : "surface.borderStrong",
            },
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {leftElement && (
            <Box css={{ display: "flex", alignItems: "center", justifyContent: "center", color: "text.quaternary", padding: "0 12px", height: "100%" }}>
              {leftElement}
            </Box>
          )}
          <ChakraInput
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={describedBy}
            aria-required={required}
            disabled={disabled}
            css={{
              flex: 1,
              bg: "transparent",
              border: "none",
              outline: "none",
              fontSize: "var(--fontSizes-sm)",
              color: "var(--colors-text-primary)",
              height: "44px",
              _placeholder: { color: "var(--colors-text-quaternary)", opacity: 0.7 },
              _disabled: { opacity: 0.5, cursor: "not-allowed" },
            }}
            {...rest}
          />
          {isPassword && showPasswordToggle && (
            <Box
              onClick={handleTogglePassword}
              tabIndex={-1}
              css={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.quaternary",
                padding: "0 12px",
                height: "100%",
                cursor: "pointer",
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </Box>
          )}
          {rightElement && (
            <Box css={{ display: "flex", alignItems: "center", justifyContent: "center", color: "text.quaternary", padding: "0 12px", height: "100%" }}>
              {rightElement}
            </Box>
          )}
        </Box>
        {error && <Text id={errorId} css={{ fontSize: "xs", color: "status.error.text", display: "flex", alignItems: "center", gap: 1 }}>{error}</Text>}
        {hint && !error && <Text id={hintId} css={{ fontSize: "xs", color: "text.quaternary" }}>{hint}</Text>}
      </Field.Root>
    );
  }
);

InputWrapper.displayName = "Input";

export { InputWrapper as Input, type InputProps };
