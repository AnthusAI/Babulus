"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";

type LiveNode = HTMLElement & {
  dataset: {
    docsLive?: string;
    w?: string;
    h?: string;
    autoplay?: string;
    mounted?: string;
  };
};

export function DocsLiveMount() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<LiveNode>("[data-docs-live]"));
    if (nodes.length === 0) {
      return;
    }
    let mounted = false;
    void import("./live-demos").then((module) => {
      if (mounted) return;
      const registry: Record<string, (props: { autoPlay?: boolean }) => JSX.Element> = {
        "temporal-reflow": ({ autoPlay }) => <module.TemporalReflowDemo autoPlay={autoPlay} />,
        "sequence-stack": () => <module.SequenceStackDemo />,
        "live-open-ended": () => <module.LiveOpenEndedDemo />,
        "live-dom-edit": () => <module.LiveDomEditDemo />,
        "named-actions": () => <module.NamedActionsDemo />,
        "multi-screen-sync": () => <module.MultiScreenSyncDemo />,
      };
      nodes.forEach((node) => {
        if (node.dataset.mounted === "true") return;
        const id = node.dataset.docsLive;
        if (!id) return;
        const autoPlay = node.dataset.autoplay === "true";
        const Demo = registry[id];
        if (!Demo) return;
        node.dataset.mounted = "true";
        const root = createRoot(node);
        root.render(<Demo autoPlay={autoPlay} />);
      });
    });
    return () => {
      mounted = true;
    };
  }, []);

  return null;
}
