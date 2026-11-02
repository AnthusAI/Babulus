import type { ReactNode } from "react";

export default function DocsPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          height: auto !important;
          overflow: hidden !important;
        }
      `}</style>
      {children}
    </>
  );
}
