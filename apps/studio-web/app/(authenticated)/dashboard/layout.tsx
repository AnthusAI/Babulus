import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard - Babulus",
  description: "Your Babulus projects, videos, and recent activity.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
