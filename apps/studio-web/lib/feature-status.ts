/**
 * Availability labels for the features on the Babulus home page: one config value per feature.
 *
 * Follows Anth.us-web `web/product_availability_labels.py` (PRODUCT_AVAILABILITY_LABEL_BY_NAME, where
 * Babulus itself is "Planned") and Cyclotron-web `components/offerings.ts` (OfferingAvailability).
 * Delete a feature's line at launch and its chip disappears everywhere; a feature with no line shows
 * no chip.
 */

export type FeatureStatusLabel = "Beta" | "Early access" | "Planned";

export const FEATURE_STATUS_LABELS: readonly FeatureStatusLabel[] = ["Beta", "Early access", "Planned"];

export const FEATURE_STATUS_BY_ID: Readonly<Record<string, FeatureStatusLabel>> = {
  "research-ideas": "Planned",
  "script-storyboard": "Planned",
  "render-publish": "Planned",
  "publish-youtube": "Planned",
  "publish-x": "Planned",
  "publish-tiktok": "Planned",
  "translate-on-screen-text": "Planned",
  "translate-voiceover": "Planned",
  "translate-consistency": "Planned",
};

export function featureStatusFor(featureId: string): FeatureStatusLabel | null {
  return Object.prototype.hasOwnProperty.call(FEATURE_STATUS_BY_ID, featureId)
    ? FEATURE_STATUS_BY_ID[featureId]
    : null;
}
