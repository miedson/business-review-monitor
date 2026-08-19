"use client";

import { IconButton } from "@chakra-ui/react";
import { useThemeMode } from "@/lib/design-system/theme-context";

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export interface ThemeToggleProps {
  variant?: "icon" | "button";
  "aria-label"?: string;
}

export function ThemeToggle({ variant = "icon", "aria-label": providedAriaLabel, ...rest }: ThemeToggleProps) {
  const { themeMode, setThemeMode } = useThemeMode();

  const isDark = themeMode === "dark";
  const toggleTheme = () => setThemeMode(isDark ? "light" : "dark");

  const ariaLabel = providedAriaLabel ?? (isDark ? "Modo claro" : "Modo escuro");

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        aria-label={ariaLabel}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "inherit",
          ...rest,
        }}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </button>
    );
  }

  return (
    <IconButton
      onClick={toggleTheme}
      aria-label={ariaLabel}
      variant="ghost"
      size="sm"
      {...rest}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  );
}

ThemeToggle.displayName = "ThemeToggle";