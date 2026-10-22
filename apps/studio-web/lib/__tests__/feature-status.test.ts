import { FEATURE_STATUS_BY_ID, FEATURE_STATUS_LABELS, featureStatusFor } from "../feature-status";

describe("feature status labels", () => {
  it("uses only the Anthus availability labels", () => {
    for (const label of Object.values(FEATURE_STATUS_BY_ID)) {
      expect(FEATURE_STATUS_LABELS).toContain(label);
    }
  });

  it("returns the configured label, and nothing for an unlisted feature", () => {
    expect(featureStatusFor("publish-youtube")).toBe("Planned");
    expect(featureStatusFor("not-a-feature")).toBeNull();
    expect(featureStatusFor("toString")).toBeNull();
  });
});
