"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  LiveDomEditDemo,
  LiveOpenEndedDemo,
  MultiScreenSyncDemo,
  NamedActionsDemo,
  SequenceStackDemo,
  TemporalReflowDemo,
} from "./live-demos";

type LiveNode = HTMLElement & {
  dataset: {
    docsLive?: string;
    w?: string;
    h?: string;
    autoplay?: string;
    mounted?: string;
  };
};

const DEMO_REGISTRY: Record<string, (props: { autoPlay?: boolean }) => JSX.Element> = {
  "temporal-reflow": ({ autoPlay }) => <TemporalReflowDemo autoPlay={autoPlay} />,
  "sequence-stack": () => <SequenceStackDemo />,
  "live-open-ended": () => <LiveOpenEndedDemo />,
  "live-dom-edit": () => <LiveDomEditDemo />,
  "named-actions": () => <NamedActionsDemo />,
  "multi-screen-sync": () => <MultiScreenSyncDemo />,
};

export function DocsLiveMount() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<LiveNode>("[data-docs-live]"));
    nodes.forEach((node) => {
      if (node.dataset.mounted === "true") return;
      const id = node.dataset.docsLive;
      if (!id) return;
      const autoPlay = node.dataset.autoplay === "true";
      const Demo = DEMO_REGISTRY[id];
      if (!Demo) return;
      node.dataset.mounted = "true";
      const root = createRoot(node);
      root.render(<Demo autoPlay={autoPlay} />);
    });
  }, []);

  return null;
}
