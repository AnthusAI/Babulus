import type { Metadata } from "next";
import { LiveVomPage } from "@/components/live-vom-page";

export const metadata: Metadata = {
  title: "Live VOM",
  description: "Realtime video composition from XML with an always-playing live preview.",
};

export default function LivePage() {
  return <LiveVomPage />;
}
