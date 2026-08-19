import type { ThemeMode } from "@/lib/design-system/theme-context";

const THEME_STORAGE_KEY = "theme";
const THEME_CLASS_MAPPING: Record<ThemeMode, string> = {
  light: "",
  dark: "dark",
};

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (stored === "light" || stored === "dark")) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}

export function setStoredTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

export function updateThemeClass(theme: ThemeMode) {
  if (typeof window === "undefined") return;

  const html = document.documentElement;
  const className = THEME_CLASS_MAPPING[theme];
  
  if (className) {
    html.classList.add(className);
    html.setAttribute("data-theme", "dark");
  } else {
    html.classList.remove("dark");
    html.removeAttribute("data-theme");
  }
}

export function toggleTheme(): ThemeMode {
  const current = getStoredTheme();
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  setStoredTheme(next);
  updateThemeClass(next);
  return next;
}