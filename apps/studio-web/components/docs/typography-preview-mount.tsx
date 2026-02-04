"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { TypographySchemePreview } from "./typography-scheme-preview";

type PreviewNode = HTMLElement & {
  dataset: {
    typographyPreview?: string;
    payload?: string;
    mounted?: string;
  };
};

const decodePayload = (value?: string) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export function TypographyPreviewMount() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<PreviewNode>("[data-typography-preview]"),
    );

    nodes.forEach((node) => {
      if (node.dataset.mounted === "true") return;
      const payload = decodePayload(node.dataset.payload);
      if (!payload) return;
      node.dataset.mounted = "true";
      const root = createRoot(node);
      root.render(<TypographySchemePreview payload={payload} />);
    });
  }, []);

  return null;
}
