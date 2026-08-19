"use client";

import { useEffect, useState, useContext, createContext, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

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

export function ThemeProvider({ children, initialThemeMode = "light" }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode);

  useEffect(() => {
    const saved = getStoredTheme() || "light";
    setThemeModeState(saved);
    updateThemeClass(saved);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    setStoredTheme(mode);
    updateThemeClass(mode);
  };

  const contextValue: ThemeContextType = {
    themeMode,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("theme");
    if (stored && (stored === "light" || stored === "dark")) {
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
  
  if (theme === "dark") {
    html.classList.add("dark");
    html.setAttribute("data-theme", "dark");
  } else {
    html.classList.remove("dark");
    html.removeAttribute("data-theme");
  }
}