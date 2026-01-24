"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface SettingsContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <SettingsContext.Provider value={{ open, setOpen }}>
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
