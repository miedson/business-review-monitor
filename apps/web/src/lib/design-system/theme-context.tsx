"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

export type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  initialThemeMode?: ThemeMode;
}

export function ThemeProvider({ children, initialThemeMode = "system" }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode);

  useEffect(() => {
    const saved = getStoredTheme() || "system";
    setThemeModeState(saved);
    updateThemeClass(saved);
  }, []);

  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncWithSystemTheme = () => updateThemeClass("system");
    mediaQuery.addEventListener("change", syncWithSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncWithSystemTheme);
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    setStoredTheme(mode);
    updateThemeClass(mode);
  };

  const contextValue: ThemeContextType = {
    themeMode,
    setThemeMode,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("theme");
    if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}

function setStoredTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Ignore storage errors
  }
}

function updateThemeClass(theme: ThemeMode) {
  if (typeof window === "undefined") return;

  const html = document.documentElement;

  const resolvedTheme =
    theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : theme;
  if (resolvedTheme === "dark") {
    html.classList.add("dark");
    html.setAttribute("data-theme", "dark");
  } else {
    html.classList.remove("dark");
    html.removeAttribute("data-theme");
  }
}
