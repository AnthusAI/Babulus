"use client";

import * as React from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-0">
        {children}
      </main>
    </div>
  );
}
