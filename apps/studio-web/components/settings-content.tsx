"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useThemeConfig, type ThemeColor } from "@/lib/theme-config";
import { useSettings, type LayoutSettings } from "@/lib/settings-context";
import { Moon, Sun, Laptop, LayoutTemplate, MessageSquare, Code2, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

import { createBillingAccountAction, setBillingVisibilityAction, updateOrgDomainAction } from "@/app/actions";
import { useBillingAccount } from "@/lib/use-org-data";
import { useOrgs } from "@/lib/use-org-data";
import { Input } from "@/components/ui/input";

export function SettingsContent({ onClose }: { onClose?: () => void }) {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme();
  const { color, setColor } = useThemeConfig();
  const { layout, updateLayout } = useSettings();
  const { orgs } = useOrgs();
  const activeOrgId = orgs[0]?.id; // Simplification: assuming first org for settings
  const activeOrg = orgs[0];
  const { account, refetch: refetchBilling } = useBillingAccount(activeOrgId);
  const [mounted, setMounted] = useState(false);

  // Local state for preview
  const [localLayout, setLocalLayout] = useState<LayoutSettings>(layout);
  const [localTheme, setLocalTheme] = useState<string>(theme || "system");
  const [localColor, setLocalColor] = useState<ThemeColor>(color);
  const [localVisibility, setLocalVisibility] = useState<"full" | "redacted">(account?.usageVisibilityMode ?? "full");
  const [localDomain, setLocalDomain] = useState<string>(activeOrg?.customDomain || "");

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setLocalLayout(layout);
    setLocalTheme(theme || "system");
    setLocalColor(color);
    setLocalVisibility(account?.usageVisibilityMode ?? "full");
    setLocalDomain(activeOrg?.customDomain || "");
  }, [layout, theme, color, account, activeOrg]);

  if (!mounted) return null;

  const handleSave = async () => {
    updateLayout(localLayout);
    setTheme(localTheme);
    setColor(localColor);
    
    if (activeOrgId) {
        // Save billing visibility
        if (!account) {
            await createBillingAccountAction({
                orgId: activeOrgId,
                usageVisibilityMode: localVisibility,
                billingMode: localVisibility === 'full' ? 'byok' : 'credits'
            }, activeOrgId);
        } else if (account.usageVisibilityMode !== localVisibility) {
            await setBillingVisibilityAction(account.id, localVisibility, activeOrgId);
        }
        refetchBilling();

        // Save custom domain
        if (localDomain !== (activeOrg?.customDomain || "")) {
           await updateOrgDomainAction(activeOrgId, localDomain || null);
        }
    }

    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  // Determine preview classes
  const previewMode =
    localTheme === "system"
      ? (systemTheme ||
          resolvedTheme ||
          (typeof document !== "undefined" && document.documentElement.classList.contains("dark")
            ? "dark"
            : "light"))
      : localTheme;
  const isDark = previewMode === 'dark';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="theme">Appearance</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
          </TabsList>

          {/* THEME TAB */}
          <TabsContent value="theme" className="flex flex-col gap-8">
            {/* Mode Selection */}
            <div className="space-y-4">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Appearance</Label>
              <div className="grid grid-cols-3 gap-4">
                <ThemeModeCard 
                  label="Light" 
                  active={localTheme === "light"} 
                  onClick={() => setLocalTheme("light")}
                  icon={<Sun className="w-5 h-5" />}
                />
                <ThemeModeCard 
                  label="Dark" 
                  active={localTheme === "dark"} 
                  onClick={() => setLocalTheme("dark")}
                  icon={<Moon className="w-5 h-5" />}
                />
                <ThemeModeCard 
                  label="System" 
                  active={localTheme === "system"} 
                  onClick={() => setLocalTheme("system")}
                  icon={<Laptop className="w-5 h-5" />}
                />
              </div>
            </div>

            {/* Color Theme Selection */}
            <div className="space-y-4">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Theme Color</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ThemeColorCard 
                  label="Cool (Default)" 
                  active={localColor === "cool"} 
                  onClick={() => setLocalColor("cool")}
                  previewColors={["bg-slate-200", "bg-slate-400", "bg-slate-900"]}
                />
                <ThemeColorCard 
                  label="Neutral" 
                  active={localColor === "neutral"} 
                  onClick={() => setLocalColor("neutral")}
                  previewColors={["bg-zinc-200", "bg-zinc-400", "bg-zinc-900"]}
                />
                <ThemeColorCard 
                  label="Warm" 
                  active={localColor === "warm"} 
                  onClick={() => setLocalColor("warm")}
                  previewColors={["bg-stone-200", "bg-stone-400", "bg-stone-900"]}
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Theme Preview</Label>
              
              {/* Preview Container Wrapper with Theme Variables */}
              <div
                className={cn(
                  "rounded-xl transition-colors duration-200 theme-scope",
                  isDark ? "dark" : "light"
                )}
                data-theme={localColor}
                style={{ colorScheme: isDark ? "dark" : "light" }}
              >
                <div className="p-6 rounded-xl bg-background text-foreground flex flex-col gap-4 transition-colors duration-200">
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
          </TabsContent>

          {/* LAYOUT TAB */}
          <TabsContent value="layout" className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                {/* Chat Position */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground uppercase tracking-wider text-xs">Chat Position</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <OptionCard 
                      label="Left" 
                      active={localLayout.chatPosition === "left"} 
                      onClick={() => setLocalLayout({ ...localLayout, chatPosition: "left" })}
                    />
                    <OptionCard 
                      label="Right" 
                      active={localLayout.chatPosition === "right"} 
                      onClick={() => setLocalLayout({ ...localLayout, chatPosition: "right" })}
                    />
                  </div>
                </div>

                {/* Main Axis */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground uppercase tracking-wider text-xs">Input / Output Orientation</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <OptionCard 
                      label="Columns" 
                      description="Side-by-side"
                      active={localLayout.mainAxis === "horizontal"} 
                      onClick={() => setLocalLayout({ ...localLayout, mainAxis: "horizontal" })}
                    />
                    <OptionCard 
                      label="Rows" 
                      description="Stacked"
                      active={localLayout.mainAxis === "vertical"} 
                      onClick={() => setLocalLayout({ ...localLayout, mainAxis: "vertical" })}
                    />
                  </div>
                </div>

                {/* Input Position */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground uppercase tracking-wider text-xs">Primary Pane</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <OptionCard 
                      label="Input First" 
                      description={localLayout.mainAxis === "horizontal" ? "Left side" : "Top"}
                      active={localLayout.inputPosition === "first"} 
                      onClick={() => setLocalLayout({ ...localLayout, inputPosition: "first" })}
                    />
                    <OptionCard 
                      label="Output First" 
                      description={localLayout.mainAxis === "horizontal" ? "Right side" : "Bottom"}
                      active={localLayout.inputPosition === "second"} 
                      onClick={() => setLocalLayout({ ...localLayout, inputPosition: "second" })}
                    />
                  </div>
                </div>
              </div>

              {/* Layout Preview */}
              <div className="space-y-4">
                <Label className="text-muted-foreground uppercase tracking-wider text-xs">Layout Preview</Label>
                <div className="aspect-[16/10] bg-card rounded-xl p-4 flex gap-2">
                  {/* Chat Left */}
                  {localLayout.chatPosition === "left" && <ChatPreview />}
                  
                  {/* Main Content Area */}
                  <div className={cn(
                    "flex-1 flex gap-2 rounded-lg overflow-hidden",
                    localLayout.mainAxis === "vertical" ? "flex-col" : "flex-row"
                  )}>
                    {localLayout.inputPosition === "first" ? (
                      <>
                        <InputPreview />
                        <OutputPreview />
                      </>
                    ) : (
                      <>
                        <OutputPreview />
                        <InputPreview />
                      </>
                    )}
                  </div>

                  {/* Chat Right */}
                  {localLayout.chatPosition === "right" && <ChatPreview />}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Preview shows how your editor will look.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* BILLING TAB */}
          <TabsContent value="billing" className="flex flex-col gap-8">
            <div className="space-y-4">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Usage Visibility</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OptionCard 
                  label="Transparent (BYOK)" 
                  description="Show estimated costs in $"
                  active={localVisibility === "full"} 
                  onClick={() => setLocalVisibility("full")}
                />
                <OptionCard 
                  label="Managed (Credits)" 
                  description="Show abstract usage credits"
                  active={localVisibility === "redacted"} 
                  onClick={() => setLocalVisibility("redacted")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This setting controls how usage costs are displayed in the Video Editor. 
                "Transparent" is for users who bring their own keys or want detailed cost breakdown. 
                "Managed" is for users on flat-rate or credit-based plans.
              </p>
            </div>
          </TabsContent>

          {/* DOMAINS TAB */}
          <TabsContent value="domains" className="flex flex-col gap-8">
            <div className="space-y-4">
              <Label className="text-muted-foreground uppercase tracking-wider text-xs">Custom Domain</Label>
              <div className="flex gap-2">
                 <Input 
                   placeholder="e.g. video.mycompany.com" 
                   value={localDomain}
                   onChange={(e) => setLocalDomain(e.target.value)}
                 />
              </div>
              <p className="text-xs text-muted-foreground">
                Set a custom domain for your published videos. You will need to configure a CNAME record pointing to <code>share.babulus.dev</code>.
              </p>
              {activeOrg?.customDomain && (
                 <div className="flex items-center gap-2 text-sm">
                    <div className={cn("w-2 h-2 rounded-full", activeOrg.customDomainVerified ? "bg-green-500" : "bg-yellow-500")} />
                    <span>{activeOrg.customDomainVerified ? "Verified" : "Pending Verification (mock)"}</span>
                 </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DialogFooter className="p-6 pt-2 border-t mt-auto">
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </DialogFooter>
    </div>
  );
}

function OptionCard({ label, description, active, onClick }: { label: string, description?: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-200 border-none",
        active 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      {description && <span className={cn("text-xs opacity-70", active ? "text-primary-foreground" : "text-muted-foreground")}>{description}</span>}
    </button>
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
    </button>
  );
}

// Preview Components for Layout
function InputPreview() {
  return (
    <div className="flex-1 bg-muted/50 rounded-md border border-dashed border-muted-foreground/20 flex flex-col items-center justify-center p-2 gap-2">
      <Code2 className="w-4 h-4 text-muted-foreground" />
      <span className="text-[10px] uppercase font-bold text-muted-foreground">Input</span>
    </div>
  );
}

function OutputPreview() {
  return (
    <div className="flex-1 bg-primary/10 rounded-md border border-primary/20 flex flex-col items-center justify-center p-2 gap-2">
      <MonitorPlay className="w-4 h-4 text-primary" />
      <span className="text-[10px] uppercase font-bold text-primary">Output</span>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="w-16 bg-muted rounded-md flex flex-col items-center py-4 gap-2">
      <MessageSquare className="w-4 h-4 text-muted-foreground" />
      <div className="w-8 h-1.5 bg-muted-foreground/20 rounded-full" />
      <div className="w-6 h-1.5 bg-muted-foreground/20 rounded-full" />
      <div className="flex-1" />
      <div className="w-10 h-6 bg-background rounded-md border border-border" />
    </div>
  );
}
