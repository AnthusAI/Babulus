"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DocsEntry } from "@/lib/docs-registry";
import { DOCS, docsHref } from "@/lib/docs-registry";

export type DocsSearchProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SearchResult = {
  doc: DocsEntry;
  score: number;
  matchType: "title" | "description" | "content";
};

export function DocsSearch({ isOpen, onClose }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults = searchDocs(query);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query]);

  const navigateToResult = useCallback(
    (doc: DocsEntry) => {
      router.push(docsHref(doc));
      onClose();
    },
    [router, onClose]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        navigateToResult(results[selectedIndex].doc);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, navigateToResult]);

  if (!isOpen) return null;

  return (
    <div className="docs-search-overlay" onClick={onClose}>
      <div className="docs-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="docs-search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="docs-search-input"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search documentation"
          />
          <kbd className="docs-search-hint">ESC</kbd>
        </div>

        {query && results.length === 0 && (
          <div className="docs-search-no-results">No results found for "{query}"</div>
        )}

        {results.length > 0 && (
          <ul className="docs-search-results">
            {results.map((result, index) => (
              <li
                key={docsHref(result.doc)}
                className={`docs-search-result ${index === selectedIndex ? "selected" : ""}`}
                onClick={() => navigateToResult(result.doc)}
              >
                <div className="docs-search-result-title">{result.doc.title}</div>
                <div className="docs-search-result-meta">
                  <span className="docs-search-result-category">{result.doc.category}</span>
                  {result.doc.personas && result.doc.personas.length > 0 && (
                    <span className="docs-search-result-personas">
                      {result.doc.personas.join(", ")}
                    </span>
                  )}
                </div>
                <div className="docs-search-result-description">{result.doc.description}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="docs-search-footer">
          <div className="docs-search-shortcuts">
            <kbd>↑↓</kbd> Navigate
            <kbd>↵</kbd> Select
            <kbd>ESC</kbd> Close
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Search documentation entries
 */
function searchDocs(query: string): SearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const doc of DOCS) {
    // Skip hidden docs
    if (doc.navHidden) continue;

    // Check title match
    if (doc.title.toLowerCase().includes(normalizedQuery)) {
      results.push({
        doc,
        score: 100,
        matchType: "title",
      });
      continue;
    }

    // Check description match
    if (doc.description.toLowerCase().includes(normalizedQuery)) {
      results.push({
        doc,
        score: 50,
        matchType: "description",
      });
      continue;
    }

    // Check content match (HTML)
    const plainText = stripHtml(doc.html);
    if (plainText.toLowerCase().includes(normalizedQuery)) {
      results.push({
        doc,
        score: 10,
        matchType: "content",
      });
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  // Limit to top 10 results
  return results.slice(0, 10);
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hook for managing search modal state with keyboard shortcut
 */
export function useDocsSearch(): [boolean, () => void, () => void] {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return [isOpen, open, close];
}
