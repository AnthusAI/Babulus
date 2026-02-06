import { glossaryTerms, type GlossaryTerm } from "./glossary-data";

/**
 * Auto-link glossary terms in HTML content
 * Links first occurrence of each term per page
 */
export function autoLinkGlossaryTerms(html: string): string {
  let processedHtml = html;
  const linkedTerms = new Set<string>();

  // Sort terms by length (descending) to match longer phrases first
  // e.g., "Video Object Model" before "Video"
  const sortedTerms = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length);

  for (const glossaryTerm of sortedTerms) {
    // Skip if already linked
    if (linkedTerms.has(glossaryTerm.term.toLowerCase())) {
      continue;
    }

    // Find first occurrence in plain text (not in HTML tags, code blocks, or links)
    const linkedHtml = linkFirstOccurrence(processedHtml, glossaryTerm);

    if (linkedHtml !== processedHtml) {
      processedHtml = linkedHtml;
      linkedTerms.add(glossaryTerm.term.toLowerCase());
    }
  }

  return processedHtml;
}

/**
 * Link first occurrence of a glossary term in HTML
 */
function linkFirstOccurrence(html: string, term: GlossaryTerm): string {
  // Create regex pattern for the term
  // Match whole words only, case-insensitive
  const pattern = new RegExp(
    `\\b(${escapeRegex(term.term)})\\b`,
    "i"
  );

  // Split HTML into segments: tags, code blocks, and text
  const segments = splitHtmlSegments(html);

  let foundFirstOccurrence = false;

  const processedSegments = segments.map((segment) => {
    // Skip segments that are HTML tags or code blocks
    if (segment.isTag || segment.isCode || foundFirstOccurrence) {
      return segment.content;
    }

    // Check if this text segment contains the term
    const match = segment.content.match(pattern);
    if (match) {
      foundFirstOccurrence = true;

      // Replace the first occurrence with a link
      const replacement = `<a href="/docs/glossary#${slugify(term.term)}" class="glossary-link" title="${escapeHtml(term.definition.slice(0, 150))}...">${match[1]}</a>`;

      return segment.content.replace(pattern, replacement);
    }

    return segment.content;
  });

  return processedSegments.join("");
}

type HtmlSegment = {
  content: string;
  isTag: boolean;
  isCode: boolean;
};

/**
 * Split HTML into segments (tags, code blocks, text)
 */
function splitHtmlSegments(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = [];
  let currentPos = 0;

  // Match HTML tags and code blocks
  const tagRegex = /<[^>]+>/g;
  const codeRegex = /<code[^>]*>.*?<\/code>/gs;
  const preRegex = /<pre[^>]*>.*?<\/pre>/gs;

  // Find all tags and code blocks
  const allMatches: Array<{ index: number; length: number; isCode: boolean }> = [];

  let match: RegExpExecArray | null;

  // Find code blocks (pre and code tags)
  while ((match = codeRegex.exec(html)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, isCode: true });
  }

  codeRegex.lastIndex = 0;
  while ((match = preRegex.exec(html)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, isCode: true });
  }

  // Find regular tags
  tagRegex.lastIndex = 0;
  while ((match = tagRegex.exec(html)) !== null) {
    const tagMatch = match;
    // Check if this tag is inside a code block
    const inCodeBlock = allMatches.some(
      (codeMatch) =>
        codeMatch.isCode &&
        tagMatch.index >= codeMatch.index &&
        tagMatch.index < codeMatch.index + codeMatch.length
    );

    if (!inCodeBlock) {
      allMatches.push({ index: tagMatch.index, length: tagMatch[0].length, isCode: false });
    }
  }

  // Sort matches by position
  allMatches.sort((a, b) => a.index - b.index);

  // Build segments
  for (const match of allMatches) {
    // Add text before this match
    if (match.index > currentPos) {
      const textContent = html.slice(currentPos, match.index);
      segments.push({ content: textContent, isTag: false, isCode: false });
    }

    // Add this match
    const matchContent = html.slice(match.index, match.index + match.length);
    segments.push({
      content: matchContent,
      isTag: !match.isCode,
      isCode: match.isCode,
    });

    currentPos = match.index + match.length;
  }

  // Add remaining text
  if (currentPos < html.length) {
    segments.push({ content: html.slice(currentPos), isTag: false, isCode: false });
  }

  return segments;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert term to URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get glossary term by slug
 */
export function getGlossaryTermBySlug(slug: string): GlossaryTerm | undefined {
  return glossaryTerms.find((term) => slugify(term.term) === slug);
}

/**
 * Generate tooltip HTML for a glossary term
 */
export function generateGlossaryTooltip(term: GlossaryTerm): string {
  return `
    <div class="glossary-tooltip">
      <div class="glossary-tooltip-term">${escapeHtml(term.term)}</div>
      <div class="glossary-tooltip-definition">${escapeHtml(term.definition)}</div>
      ${term.technicalNote ? `<div class="glossary-tooltip-note">Technical: ${escapeHtml(term.technicalNote)}</div>` : ""}
    </div>
  `;
}
