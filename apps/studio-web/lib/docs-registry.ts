import { componentsGuideDoc } from "@/lib/docs-content/components-guide";
import { configSetupDoc } from "@/lib/docs-content/config-setup";
import { introductionDoc } from "@/lib/docs-content/introduction";
import { roadmapDoc } from "@/lib/docs-content/roadmap";
import { ttsAwsPollyQuickstartDoc } from "@/lib/docs-content/tts-aws-polly-quickstart";
import { ttsAzureSpeechQuickstartDoc } from "@/lib/docs-content/tts-azure-speech-quickstart";
import { babulusLanguageDesignDoc } from "@/lib/docs-content/babulus-language-design";
import { videomlStandardDoc } from "@/lib/docs-content/videoml-standard";
import { videomlConformanceDoc } from "@/lib/docs-content/videoml-conformance";
import { ttsElevenlabsGuideDoc } from "@/lib/docs-content/tts-elevenlabs-guide";
import { technicalDoc } from "@/lib/docs-content/technical";
import { environmentsDoc } from "@/lib/docs-content/environments";
import { projectStorageArchitectureDoc } from "@/lib/docs-content/project-storage-architecture";
import { projectStorageQuickstartDoc } from "@/lib/docs-content/project-storage-quickstart";
import { renderingOverviewDoc } from "@/lib/docs-content/rendering-overview";
import { renderingMode1Doc } from "@/lib/docs-content/rendering-mode-1-local";
import { renderingMode2Doc } from "@/lib/docs-content/rendering-mode-2-container";
import { renderingMode3Doc } from "@/lib/docs-content/rendering-mode-3-cloud";
import { configurationContent } from "@/lib/docs-content/configuration";
import { marked } from "marked";
import { componentsLayoutsDoc } from "@/lib/docs-content/components-layouts";
import { componentsTypographyDoc } from "@/lib/docs-content/components-typography";
import { componentsColorsDoc } from "@/lib/docs-content/components-colors";
import { animationDoc } from "@/lib/docs-content/animation";
import { componentsDoc } from "@/lib/docs-content/components";
import { liveVomDoc } from "@/lib/docs-content/live-vom";
import { glossaryDoc } from "@/lib/docs-content/glossary";
import { autoLinkGlossaryTerms } from "@/lib/glossary-linker";

export type DocsCategory =
  | "Overview"
  | "Guides"
  | "Designers"
  | "Rendering"
  | "Developer Reference"
  | "Standards"
  | "TTS Providers"
  | "Project Storage"
  | "Roadmap";

export type DocsPersona = "all" | "designers" | "developers";

export type DocsDifficulty = "beginner" | "intermediate" | "advanced";

export type DocsEntry = Readonly<{
  slug: readonly string[];
  title: string;
  description: string;
  category: DocsCategory;
  html: string;
  internal?: boolean;
  // For docs that should be reachable by URL, but not listed in the left nav index.
  navHidden?: boolean;
  // Personas that should see this doc (defaults to ["all"])
  personas?: readonly DocsPersona[];
  // Difficulty level for the content
  difficulty?: DocsDifficulty;
  // Learning path this doc belongs to
  learningPath?: string;
  // Related doc slugs (as joined strings for easier matching)
  relatedDocs?: readonly string[];
  // Last reviewed date (ISO 8601 format)
  lastReviewed?: string;
}>;

const legacyLinkMap: ReadonlyMap<string, string> = new Map([
  ["./environments.md", "/docs/environments"],
  ["environments.md", "/docs/environments"],
  ["./CONFIG-SETUP.md", "/docs/config-setup"],
  ["CONFIG-SETUP.md", "/docs/config-setup"],
  ["./config-setup.md", "/docs/config-setup"],
  ["config-setup.md", "/docs/config-setup"],
  ["./aws-polly-quickstart.md", "/docs/tts/aws-polly-quickstart"],
  ["aws-polly-quickstart.md", "/docs/tts/aws-polly-quickstart"],
  ["./azure-speech-quickstart.md", "/docs/tts/azure-speech-quickstart"],
  ["azure-speech-quickstart.md", "/docs/tts/azure-speech-quickstart"],
  ["./elevenlabs-guide.md", "/docs/tts/elevenlabs-guide"],
  ["elevenlabs-guide.md", "/docs/tts/elevenlabs-guide"],
  ["./project-storage-quickstart.md", "/docs/project-storage/quickstart"],
  ["project-storage-quickstart.md", "/docs/project-storage/quickstart"],
  ["./project-storage-architecture.md", "/docs/project-storage/architecture"],
  ["project-storage-architecture.md", "/docs/project-storage/architecture"],
  ["./worker-job-spec.md", "/docs/worker-job-spec"],
  ["worker-job-spec.md", "/docs/worker-job-spec"],
  ["./babulus-language-design.md", "/docs/babulus-language-design"],
  ["babulus-language-design.md", "/docs/babulus-language-design"],
  ["./videoml-standard.md", "/docs/videoml-standard"],
  ["videoml-standard.md", "/docs/videoml-standard"],
  ["./security-verification.md", "/docs/security-verification"],
  ["security-verification.md", "/docs/security-verification"],
  ["./test-coverage.md", "/docs/test-coverage"],
  ["test-coverage.md", "/docs/test-coverage"],
  ["./BRANDING.md", "/docs/branding"],
  ["BRANDING.md", "/docs/branding"],
  ["./NEXT-STEPS.md", "/docs/roadmap"],
  ["NEXT-STEPS.md", "/docs/roadmap"],
  ["./STATUS.md", "/docs/roadmap"],
  ["STATUS.md", "/docs/roadmap"],
  ["./studio-implementation-plan.md", "/docs/roadmap"],
  ["studio-implementation-plan.md", "/docs/roadmap"],
  ["./saas-electron-plan.md", "/docs/technical"],
  ["saas-electron-plan.md", "/docs/technical"],
  ["./session-2026-01-25-summary.md", "/docs/roadmap"],
  ["session-2026-01-25-summary.md", "/docs/roadmap"],

  ["docs/project-storage-architecture.md", "/docs/project-storage/architecture"],
  ["docs/project-storage-quickstart.md", "/docs/project-storage/quickstart"],
  ["apps/studio-web/docs/project-storage-architecture.md", "/docs/project-storage/architecture"],
  ["apps/studio-web/docs/security-verification.md", "/docs/security-verification"],
  ["docs/security-verification.md", "/docs/security-verification"],
  ["docs/session-2026-01-25-summary.md", "/docs/roadmap"],
  ["docs/STATUS.md", "/docs/roadmap"],
  ["docs/NEXT-STEPS.md", "/docs/roadmap"],
  ["docs/studio-implementation-plan.md", "/docs/roadmap"],
  ["docs/saas-electron-plan.md", "/docs/technical"],
]);

function normalizeDocHtml(html: string, slug: readonly string[]) {
  let normalized = html;

  for (const [legacy, href] of legacyLinkMap.entries()) {
    normalized = normalized.split(legacy).join(href);
  }

  normalized = normalized.replaceAll("href=\"./openai-quickstart.md\"", "href=\"/docs\"");
  normalized = normalized.replaceAll("href=\"./provider-comparison.md\"", "href=\"/docs\"");

  // Skip auto-linking for the glossary page itself
  const isGlossaryPage = slug.length === 1 && slug[0] === "glossary";
  if (!isGlossaryPage) {
    normalized = autoLinkGlossaryTerms(normalized);
  }

  return normalized;
}

const configurationDoc: DocsEntry = {
  slug: ["configuration"],
  title: "Configuration",
  description: "Configure API keys, TTS providers, and global settings",
  category: "Overview",
  html: marked.parse(configurationContent) as string,
};

const RAW_DOCS: readonly DocsEntry[] = [
  introductionDoc,
  configurationDoc,
  renderingOverviewDoc,
  renderingMode1Doc,
  renderingMode2Doc,
  renderingMode3Doc,
  componentsLayoutsDoc,
  componentsColorsDoc,
  componentsTypographyDoc,
  animationDoc,
  componentsDoc,
  technicalDoc,
  configSetupDoc,
  ttsAwsPollyQuickstartDoc,
  ttsAzureSpeechQuickstartDoc,
  babulusLanguageDesignDoc,
  videomlStandardDoc,
  videomlConformanceDoc,
  glossaryDoc,
  ttsElevenlabsGuideDoc,
  environmentsDoc,
  liveVomDoc,
  projectStorageArchitectureDoc,
  projectStorageQuickstartDoc,
  componentsGuideDoc,
  roadmapDoc,
];

export const DOCS: readonly DocsEntry[] = RAW_DOCS.map((doc) => ({
  ...doc,
  html: normalizeDocHtml(doc.html, doc.slug),
}));

export function docsHref(entry: Pick<DocsEntry, "slug">) {
  return `/docs/${entry.slug.join("/")}`;
}

export function docsKey(slug: readonly string[]) {
  return slug.join("/");
}

export function findDocBySlug(slug: readonly string[]) {
  const key = docsKey(slug);
  return DOCS.find((doc) => docsKey(doc.slug) === key) ?? null;
}

// Category order for landing page: accessible content first, then developer docs
const CATEGORY_ORDER: readonly DocsCategory[] = [
  // Accessible content (no section header)
  "Overview",
  "Guides",
  "Designers",
  // Developer documentation (with section header)
  "Rendering",
  "Standards",
  "Developer Reference",
  "TTS Providers",
  "Project Storage",
] as const;

/**
 * Filter docs by persona. Docs with no persona field default to ["all"].
 */
export function filterDocsByPersona(docs: readonly DocsEntry[], persona: DocsPersona | null): readonly DocsEntry[] {
  if (!persona) return docs;

  return docs.filter((doc) => {
    const docPersonas = doc.personas ?? ["all"];
    // Show if doc targets "all" or specifically includes the selected persona
    return docPersonas.includes("all") || docPersonas.includes(persona);
  });
}

/**
 * Check if a doc is relevant to a given persona.
 */
export function isDocForPersona(doc: DocsEntry, persona: DocsPersona | null): boolean {
  if (!persona) return true;
  const docPersonas = doc.personas ?? ["all"];
  return docPersonas.includes("all") || docPersonas.includes(persona);
}

/**
 * Get related docs for a given doc entry.
 */
export function getRelatedDocs(doc: DocsEntry): readonly DocsEntry[] {
  if (!doc.relatedDocs || doc.relatedDocs.length === 0) return [];

  return doc.relatedDocs
    .map((slugKey) => DOCS.find((d) => docsKey(d.slug) === slugKey))
    .filter((d): d is DocsEntry => d !== undefined);
}

/**
 * Get docs by learning path.
 */
export function getDocsByLearningPath(pathId: string): readonly DocsEntry[] {
  return DOCS.filter((doc) => doc.learningPath === pathId);
}

export function listDocsByCategory(options?: { includeInternal?: boolean }) {
  const includeInternal = options?.includeInternal ?? false;

  const categories = new Map<DocsCategory, DocsEntry[]>();
  const deferredDocs: DocsEntry[] = [];

  for (const doc of DOCS) {
    if (doc.navHidden) continue;
    if (!includeInternal && doc.internal) continue;

    if (doc.category === "Roadmap") {
      deferredDocs.push(doc);
      continue;
    }
    const existing = categories.get(doc.category) ?? [];
    existing.push(doc);
    categories.set(doc.category, existing);
  }

  // Return categories in the defined order, filtering out empty categories
  const ordered = CATEGORY_ORDER.filter((category) => categories.has(category)).map(
    (category) => ({
      category,
      docs: categories.get(category)!,
    })
  );

  if (deferredDocs.length) {
    ordered.push({
      category: "Roadmap",
      docs: deferredDocs,
    });
  }

  return ordered;
}
