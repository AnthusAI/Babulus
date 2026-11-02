import { readDataAttribute } from "../attributes.js";

/**
 * Read display metadata from the embed config element, with document fallbacks.
 */
export function readEmbedMetadata(element: HTMLElement): {
  name: string;
  byline: string;
} {
  const name =
    readDataAttribute(element, "name")?.trim() || document.title.trim() || "";
  const byline =
    readDataAttribute(element, "byline")?.trim() || location.hostname || "";
  return { name, byline };
}
