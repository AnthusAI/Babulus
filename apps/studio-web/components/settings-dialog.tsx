"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SettingsContent } from "./settings-content";
import { useSettings } from "@/lib/settings-context";

export function SettingsDialog() {
  const { open, setOpen } = useSettings();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl bg-card border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your workspace appearance.
          </DialogDescription>
        </DialogHeader>
        <SettingsContent onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
