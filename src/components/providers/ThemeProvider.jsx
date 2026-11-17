import { useEffect, useState } from "react";
import { ThemeContext } from "./ThemeContext";

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    // The design system reads its dark palette from data-theme on <html>.
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      root.dataset.theme = isDark ? "dark" : "light";
    };

    apply();

    try {
      localStorage.setItem("theme", theme);
    } catch {
      // noop
    }

    if (theme !== "system") return undefined;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
