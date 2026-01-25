"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type PanelLayout = "horizontal" | "vertical";
export type PanelPosition = "first" | "second";
export type ChatPosition = "left" | "right";

export interface LayoutSettings {
  chatPosition: ChatPosition;
  mainAxis: PanelLayout;
  inputPosition: PanelPosition;
  chatPercent: number;
  inputPercent: number;
}

const DEFAULT_LAYOUT: LayoutSettings = {
  chatPosition: "right",
  mainAxis: "horizontal",
  inputPosition: "first",
  chatPercent: 24,
  inputPercent: 50,
};

interface SettingsContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  layout: LayoutSettings;
  updateLayout: (settings: Partial<LayoutSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutSettings>(DEFAULT_LAYOUT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("babulus-layout-settings");
    if (stored) {
      try {
        setLayout({ ...DEFAULT_LAYOUT, ...JSON.parse(stored) });
      } catch (e) {
        // ignore invalid json
      }
    }
  }, []);

  const updateLayout = (settings: Partial<LayoutSettings>) => {
    const newSettings = { ...layout, ...settings };
    setLayout(newSettings);
    localStorage.setItem("babulus-layout-settings", JSON.stringify(newSettings));
  };

  // Prevent hydration mismatch by rendering default/nothing until mounted? 
  // Actually layout changes might cause flicker. 
  // For this simple case, we can accept a small hydration mismatch or just use effect.
  
  return (
    <SettingsContext.Provider value={{ open, setOpen, layout, updateLayout }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
