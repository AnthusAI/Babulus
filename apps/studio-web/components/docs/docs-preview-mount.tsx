"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { DocsPreviewPlayer } from "./docs-preview-player";

type PreviewNode = HTMLElement & {
  dataset: {
    docsPreview?: string;
    w?: string;
    h?: string;
    themeControls?: string;
    themeColor?: string;
    themeTypography?: string;
    mounted?: string;
  };
};

export function DocsPreviewMount() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<PreviewNode>("[data-docs-preview]"));
    nodes.forEach((node) => {
      if (node.dataset.mounted === "true") {
        return;
      }
      const id = node.dataset.docsPreview;
      if (!id) return;
      const width = Number(node.dataset.w ?? 1920);
      const height = Number(node.dataset.h ?? 1080);
      const showThemeControls = node.dataset.themeControls === "true";
      const defaultColorScheme = node.dataset.themeColor;
      const defaultTypographyScheme = node.dataset.themeTypography;
      node.dataset.mounted = "true";
      const root = createRoot(node);
      root.render(
        <DocsPreviewPlayer
          id={id}
          defaultWidth={width}
          defaultHeight={height}
          showThemeControls={showThemeControls}
          defaultColorScheme={defaultColorScheme}
          defaultTypographyScheme={defaultTypographyScheme}
        />,
      );
    });
  }, []);

  return null;
}
