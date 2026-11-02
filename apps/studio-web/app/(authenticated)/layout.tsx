"use client";

import type { ReactNode } from "react";
import { Authenticator } from "@/components/authenticator";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="app-viewport">
      <Authenticator>{children}</Authenticator>
    </div>
  );
}
