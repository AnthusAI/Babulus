/**
 * Input attributes accepted on the embed script, the content root and the
 * elements inside it. `data-babulus-*` is the current spelling and
 * `data-auritus-*` is an alias that keeps working for existing pages. When
 * both are present the `data-babulus-*` value wins.
 */
const ATTRIBUTE_PREFIXES = ["data-babulus-", "data-auritus-"] as const;

/** Read an input attribute by its suffix, e.g. `voice` for `data-babulus-voice`. */
export function readDataAttribute(
  element: Element,
  suffix: string,
): string | null {
  for (const prefix of ATTRIBUTE_PREFIXES) {
    const value = element.getAttribute(prefix + suffix);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

/** Whether either spelling of an input attribute is present. */
export function hasDataAttribute(element: Element, suffix: string): boolean {
  return ATTRIBUTE_PREFIXES.some((prefix) =>
    element.hasAttribute(prefix + suffix),
  );
}

/** A CSS selector matching an element that carries either spelling. */
export function dataAttributeSelector(suffix: string): string {
  return ATTRIBUTE_PREFIXES.map((prefix) => `[${prefix}${suffix}]`).join(",");
}
