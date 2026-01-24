"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useThemeConfig } from "@/lib/theme-config";
import { Check, Moon, Sun, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const { color, setColor } = useThemeConfig();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Mode Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Appearance</h3>
        <div className="grid grid-cols-3 gap-4">
          <ThemeModeCard 
            label="Light" 
            active={theme === "light"} 
            onClick={() => setTheme("light")}
            icon={<Sun className="w-5 h-5" />}
          />
          <ThemeModeCard 
            label="Dark" 
            active={theme === "dark"} 
            onClick={() => setTheme("dark")}
            icon={<Moon className="w-5 h-5" />}
          />
          <ThemeModeCard 
            label="System" 
            active={theme === "system"} 
            onClick={() => setTheme("system")}
            icon={<Laptop className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Color Theme Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Theme Color</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ThemeColorCard 
            label="Cool (Default)" 
            active={color === "cool"} 
            onClick={() => setColor("cool")}
            previewColors={["bg-slate-200", "bg-slate-400", "bg-slate-900"]}
          />
          <ThemeColorCard 
            label="Neutral" 
            active={color === "neutral"} 
            onClick={() => setColor("neutral")}
            previewColors={["bg-zinc-200", "bg-zinc-400", "bg-zinc-900"]}
          />
          <ThemeColorCard 
            label="Warm" 
            active={color === "warm"} 
            onClick={() => setColor("warm")}
            previewColors={["bg-stone-200", "bg-stone-400", "bg-stone-900"]}
          />
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Preview</h3>
        <div className="p-6 rounded-xl bg-background flex flex-col gap-4 border-none transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="h-4 w-32 bg-foreground/10 rounded-full" />
              <div className="h-3 w-20 bg-foreground/10 rounded-full" />
            </div>
            <div className="h-8 w-8 rounded-full bg-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 rounded-lg bg-muted" />
            <div className="h-24 rounded-lg bg-card p-4 flex flex-col justify-end">
               <div className="h-2 w-full bg-primary/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeModeCard({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 border-none",
        active 
          ? "bg-primary text-primary-foreground shadow-none" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function ThemeColorCard({ label, active, onClick, previewColors }: { label: string, active: boolean, onClick: () => void, previewColors: string[] }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl transition-all duration-200 border-none",
        active 
          ? "bg-card ring-2 ring-primary text-foreground" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
           <div className={cn("w-6 h-6 rounded-full border-2 border-background", previewColors[0])} />
           <div className={cn("w-6 h-6 rounded-full border-2 border-background", previewColors[1])} />
           <div className={cn("w-6 h-6 rounded-full border-2 border-background", previewColors[2])} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {active && <Check className="w-4 h-4 text-primary" />}
    </button>
  );
}
