"use client";

import * as React from "react";

export type ThemeColor = "cool" | "neutral" | "warm";

interface ThemeConfigContextType {
  color: ThemeColor;
  setColor: (color: ThemeColor) => void;
}

const ThemeConfigContext = React.createContext<ThemeConfigContextType>({
  color: "cool",
  setColor: () => {},
});

export function ThemeConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // In a real app, this would persist to localStorage or backend
  const [color, setColor] = React.useState<ThemeColor>("cool");

  // Apply data-theme attribute to body/html
  React.useEffect(() => {
    const root = document.documentElement;
    // Cool is default (no data attribute needed, or we could add one)
    if (color === "cool") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", color);
    }
  }, [color]);

  return (
    <ThemeConfigContext.Provider value={{ color, setColor }}>
      {children}
    </ThemeConfigContext.Provider>
  );
}

export const useThemeConfig = () => React.useContext(ThemeConfigContext);
