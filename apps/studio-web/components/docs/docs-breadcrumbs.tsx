import Link from "next/link";
import type { DocsEntry, DocsCategory } from "@/lib/docs-registry";

export type DocsBreadcrumbsProps = {
  doc: DocsEntry;
};

export function DocsBreadcrumbs({ doc }: DocsBreadcrumbsProps) {
  const categoryPath = getCategoryPath(doc.category);

  return (
    <nav className="docs-breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link href="/docs">Documentation</Link>
        </li>
        {categoryPath && (
          <li className="breadcrumb-item">
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-category">{categoryPath}</span>
          </li>
        )}
        <li className="breadcrumb-item">
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" aria-current="page">
            {doc.title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/**
 * Get human-readable category path
 */
function getCategoryPath(category: DocsCategory): string {
  // Map category to display name
  const categoryMap: Record<DocsCategory, string> = {
    Overview: "Overview",
    Guides: "Guides",
    Designers: "Design",
    Rendering: "Rendering",
    "Developer Reference": "Developer",
    Standards: "Standards",
    "TTS Providers": "TTS",
    "Project Storage": "Storage",
    Roadmap: "Roadmap",
  };

  return categoryMap[category] || category;
}
