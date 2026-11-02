"use client";

import { useEffect, useState } from "react";
import type { TocHeading } from "@/lib/toc-parser";
import { getActiveHeading } from "@/lib/toc-parser";

export type DocsTocProps = {
  headings: TocHeading[];
};

export function DocsToc({ headings }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const updateActiveHeading = () => {
      const active = getActiveHeading(headings);
      setActiveId(active);
    };

    // Update on mount
    updateActiveHeading();

    // Update on scroll
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveHeading);
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="docs-toc" aria-label="Table of contents">
      <h3 className="docs-toc-title">On This Page</h3>
      <ul className="docs-toc-list">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={`docs-toc-item docs-toc-item-${heading.level} ${
              activeId === heading.id ? "active" : ""
            }`}
          >
            <a
              href={`#${heading.id}`}
              className="docs-toc-link"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(heading.id);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                  // Update URL without triggering navigation
                  window.history.pushState(null, "", `#${heading.id}`);
                }
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
