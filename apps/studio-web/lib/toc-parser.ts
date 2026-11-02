/**
 * Table of Contents Parser
 * Extracts h2 and h3 headings from HTML for navigation
 */

export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

/**
 * Parse HTML content and extract h2/h3 headings with IDs
 */
export function parseToc(html: string): TocHeading[] {
  if (typeof document === "undefined") {
    // Server-side: use regex parsing
    return parseTocServer(html);
  }

  // Client-side: use DOM parsing
  return parseTocClient(html);
}

function parseTocServer(html: string): TocHeading[] {
  const headings: TocHeading[] = [];

  // Match h2 and h3 tags with id attributes
  const headingRegex = /<h([23])[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h\1>/gi;

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10) as 2 | 3;
    const id = match[2];
    const htmlContent = match[3];

    // Strip HTML tags from heading text
    const text = htmlContent
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();

    headings.push({ id, text, level });
  }

  return headings;
}

function parseTocClient(html: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const h2Elements = tempDiv.querySelectorAll("h2[id], h3[id]");

  h2Elements.forEach((element) => {
    const id = element.getAttribute("id");
    const tagName = element.tagName.toLowerCase();
    const level = tagName === "h2" ? 2 : 3;
    const text = element.textContent?.trim() || "";

    if (id && text) {
      headings.push({ id, text, level });
    }
  });

  return headings;
}

/**
 * Generate a URL-safe ID from heading text
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim hyphens from start/end
}

/**
 * Check if a heading ID is currently visible in viewport
 */
export function isHeadingVisible(headingId: string): boolean {
  if (typeof document === "undefined") return false;

  const element = document.getElementById(headingId);
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;

  // Consider visible if top 20% of viewport
  return rect.top >= 0 && rect.top <= windowHeight * 0.2;
}

/**
 * Get currently active heading based on scroll position
 */
export function getActiveHeading(headings: TocHeading[]): string | null {
  if (typeof document === "undefined" || headings.length === 0) return null;

  // Find the first visible heading
  for (const heading of headings) {
    if (isHeadingVisible(heading.id)) {
      return heading.id;
    }
  }

  // If no heading is visible in viewport, find the last heading above viewport
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  let activeId: string | null = null;

  for (const heading of headings) {
    const element = document.getElementById(heading.id);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    const absoluteTop = rect.top + scrollY;

    if (absoluteTop <= scrollY + 100) {
      activeId = heading.id;
    } else {
      break;
    }
  }

  return activeId;
}
