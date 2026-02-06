import type { DocsEntry } from "@/lib/docs-registry";
import { glossaryTerms } from "@/lib/glossary-data";

// Generate HTML for glossary page
const generateGlossaryHtml = (): string => {
  const termsByLetter = new Map<string, typeof glossaryTerms>();

  // Group terms by first letter
  for (const term of glossaryTerms) {
    const firstLetter = term.term[0].toUpperCase();
    if (!termsByLetter.has(firstLetter)) {
      termsByLetter.set(firstLetter, []);
    }
    termsByLetter.get(firstLetter)!.push(term);
  }

  // Sort letters
  const letters = Array.from(termsByLetter.keys()).sort();

  let html = `
<h1 id="glossary">VideoML Glossary</h1>

<p>
  Comprehensive reference of VideoML and Babulus terminology. All definitions use plain language first, with technical details available for developers.
</p>

<div class="my-6 rounded-lg border border-border bg-muted/30 p-4">
  <h2 class="text-sm font-semibold uppercase tracking-wide text-foreground/60 mb-3">Quick Navigation</h2>
  <div class="flex flex-wrap gap-2">
`;

  // Add letter navigation
  for (const letter of letters) {
    html += `<a href="#letter-${letter}" class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-background hover:bg-accent text-sm font-medium transition-colors">${letter}</a>\n`;
  }

  html += `
  </div>
</div>
`;

  // Add terms grouped by letter
  for (const letter of letters) {
    const terms = termsByLetter.get(letter)!;

    html += `\n<h2 id="letter-${letter}" class="mt-8 mb-4 text-2xl font-bold">${letter}</h2>\n\n`;
    html += `<div class="space-y-6">\n`;

    for (const term of terms) {
      html += `
<div id="${term.term.toLowerCase().replace(/\s+/g, "-")}" class="scroll-mt-20">
  <h3 class="text-lg font-semibold text-foreground">${term.term}</h3>
  <p class="mt-2 text-foreground/80">${term.definition}</p>
`;

      // Add technical note if present
      if (term.technicalNote) {
        html += `
  <div class="mt-3 rounded-md border-l-4 border-blue-500 bg-blue-500/10 p-3">
    <p class="text-sm text-foreground/70"><strong>Technical:</strong> ${term.technicalNote}</p>
  </div>
`;
      }

      // Add example if present
      if (term.example) {
        html += `
  <div class="mt-3">
    <p class="text-sm font-medium text-foreground/60 mb-2">Example:</p>
    <pre class="rounded-md bg-muted p-3 text-sm overflow-x-auto"><code>${term.example.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
  </div>
`;
      }

      // Add related terms if present
      if (term.relatedTerms && term.relatedTerms.length > 0) {
        html += `
  <div class="mt-3">
    <p class="text-sm font-medium text-foreground/60 mb-2">Related:</p>
    <div class="flex flex-wrap gap-2">
`;
        for (const relatedTerm of term.relatedTerms) {
          const relatedSlug = relatedTerm.toLowerCase().replace(/\s+/g, "-");
          html += `      <a href="#${relatedSlug}" class="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-accent transition-colors">${relatedTerm}</a>\n`;
        }
        html += `    </div>
  </div>
`;
      }

      // Add doc link if present
      if (term.docSlug) {
        html += `
  <div class="mt-3">
    <a href="/docs/${term.docSlug}" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
      → Learn more in ${term.docSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} →
    </a>
  </div>
`;
      }

      html += `</div>\n`;
    }

    html += `</div>\n`;
  }

  // Add search tip at bottom
  html += `
<div class="mt-12 rounded-lg border border-border bg-muted/30 p-6">
  <h2 class="text-lg font-semibold mb-3">Can't find what you're looking for?</h2>
  <p class="text-foreground/80 mb-4">
    Use the documentation search (Cmd/Ctrl+K) to find terms across all pages, or check out these resources:
  </p>
  <ul class="space-y-2 text-foreground/80">
    <li>• <a href="/docs/videoml-standard" class="text-blue-600 dark:text-blue-400 hover:underline">VideoML Standard</a> - Complete language reference</li>
    <li>• <a href="/docs/components" class="text-blue-600 dark:text-blue-400 hover:underline">Component Catalog</a> - Visual components reference</li>
    <li>• <a href="/docs/live-vom" class="text-blue-600 dark:text-blue-400 hover:underline">Live VOM</a> - Advanced timeline features</li>
  </ul>
</div>
`;

  return html;
};

export const glossaryDoc: DocsEntry = {
  slug: ["glossary"],
  title: "VideoML Glossary",
  description: "Comprehensive reference of VideoML and Babulus terminology with plain-language definitions",
  category: "Standards",
  personas: ["all", "designers", "developers"],
  difficulty: "beginner",
  html: generateGlossaryHtml(),
  lastReviewed: "2026-02-05",
};
