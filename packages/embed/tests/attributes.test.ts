import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  dataAttributeSelector,
  hasDataAttribute,
  readDataAttribute,
} from "../src/attributes.js";

function element(markup: string): Element {
  const dom = new JSDOM(`<!DOCTYPE html><body>${markup}</body>`);
  return dom.window.document.body.firstElementChild as Element;
}

describe("data attribute aliases", () => {
  it("reads the legacy spelling", () => {
    expect(
      readDataAttribute(element(`<p data-auritus-voice="a"></p>`), "voice"),
    ).toBe("a");
  });

  it("reads the current spelling", () => {
    expect(
      readDataAttribute(element(`<p data-babulus-voice="b"></p>`), "voice"),
    ).toBe("b");
  });

  it("prefers the current spelling when both are present", () => {
    const both = element(
      `<p data-auritus-voice="old" data-babulus-voice="new"></p>`,
    );
    expect(readDataAttribute(both, "voice")).toBe("new");
  });

  it("detects presence under either spelling", () => {
    expect(
      hasDataAttribute(element(`<p data-babulus-break></p>`), "break"),
    ).toBe(true);
    expect(
      hasDataAttribute(element(`<p data-auritus-break></p>`), "break"),
    ).toBe(true);
    expect(hasDataAttribute(element(`<p></p>`), "break")).toBe(false);
  });

  it("builds a selector for both spellings", () => {
    expect(dataAttributeSelector("ignore")).toBe(
      "[data-babulus-ignore],[data-auritus-ignore]",
    );
  });
});
