import { brandingDoc } from "@/lib/docs-content/branding";
import { componentsGuideDoc } from "@/lib/docs-content/components-guide";
import { configSetupDoc } from "@/lib/docs-content/config-setup";
import { roadmapNextStepsDoc } from "@/lib/docs-content/roadmap-next-steps";
import { roadmapStatusDoc } from "@/lib/docs-content/roadmap-status";
import { ttsAwsPollyQuickstartDoc } from "@/lib/docs-content/tts-aws-polly-quickstart";
import { ttsAzureSpeechQuickstartDoc } from "@/lib/docs-content/tts-azure-speech-quickstart";
import { babulusLanguageDesignDoc } from "@/lib/docs-content/babulus-language-design";
import { ttsElevenlabsGuideDoc } from "@/lib/docs-content/tts-elevenlabs-guide";
import { environmentsDoc } from "@/lib/docs-content/environments";
import { projectStorageArchitectureDoc } from "@/lib/docs-content/project-storage-architecture";
import { projectStorageQuickstartDoc } from "@/lib/docs-content/project-storage-quickstart";
import { roadmapSaasElectronPlanDoc } from "@/lib/docs-content/roadmap-saas-electron-plan";
import { securityVerificationDoc } from "@/lib/docs-content/security-verification";
import { roadmapSession20260125SummaryDoc } from "@/lib/docs-content/roadmap-session-2026-01-25-summary";
import { roadmapStudioImplementationPlanDoc } from "@/lib/docs-content/roadmap-studio-implementation-plan";
import { testCoverageDoc } from "@/lib/docs-content/test-coverage";
import { workerJobSpecDoc } from "@/lib/docs-content/worker-job-spec";

export type DocsCategory =
  | "Getting Started"
  | "TTS Providers"
  | "Project Storage"
  | "Reference"
  | "Security"
  | "Quality"
  | "Roadmap & Notes";

export type DocsEntry = Readonly<{
  slug: readonly string[];
  title: string;
  description: string;
  category: DocsCategory;
  html: string;
  internal?: boolean;
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
  ["./security-verification.md", "/docs/security-verification"],
  ["security-verification.md", "/docs/security-verification"],
  ["./test-coverage.md", "/docs/test-coverage"],
  ["test-coverage.md", "/docs/test-coverage"],
  ["./BRANDING.md", "/docs/branding"],
  ["BRANDING.md", "/docs/branding"],
  ["./NEXT-STEPS.md", "/docs/roadmap/next-steps"],
  ["NEXT-STEPS.md", "/docs/roadmap/next-steps"],
  ["./STATUS.md", "/docs/roadmap/status"],
  ["STATUS.md", "/docs/roadmap/status"],
  ["./studio-implementation-plan.md", "/docs/roadmap/studio-implementation-plan"],
  ["studio-implementation-plan.md", "/docs/roadmap/studio-implementation-plan"],
  ["./saas-electron-plan.md", "/docs/roadmap/saas-electron-plan"],
  ["saas-electron-plan.md", "/docs/roadmap/saas-electron-plan"],
  ["./session-2026-01-25-summary.md", "/docs/roadmap/session-2026-01-25-summary"],
  ["session-2026-01-25-summary.md", "/docs/roadmap/session-2026-01-25-summary"],

  ["docs/project-storage-architecture.md", "/docs/project-storage/architecture"],
  ["docs/project-storage-quickstart.md", "/docs/project-storage/quickstart"],
  ["apps/studio-web/docs/project-storage-architecture.md", "/docs/project-storage/architecture"],
  ["apps/studio-web/docs/security-verification.md", "/docs/security-verification"],
  ["docs/security-verification.md", "/docs/security-verification"],
  ["docs/session-2026-01-25-summary.md", "/docs/roadmap/session-2026-01-25-summary"],
  ["docs/STATUS.md", "/docs/roadmap/status"],
  ["docs/NEXT-STEPS.md", "/docs/roadmap/next-steps"],
  ["docs/studio-implementation-plan.md", "/docs/roadmap/studio-implementation-plan"],
  ["docs/saas-electron-plan.md", "/docs/roadmap/saas-electron-plan"],
]);

function normalizeDocHtml(html: string) {
  let normalized = html;

  for (const [legacy, href] of legacyLinkMap.entries()) {
    normalized = normalized.split(legacy).join(href);
  }

  normalized = normalized.replaceAll("href=\"./openai-quickstart.md\"", "href=\"/docs\"");
  normalized = normalized.replaceAll("href=\"./provider-comparison.md\"", "href=\"/docs\"");

  return normalized;
}

const RAW_DOCS: readonly DocsEntry[] = [
  brandingDoc,
  componentsGuideDoc,
  configSetupDoc,
  roadmapNextStepsDoc,
  roadmapStatusDoc,
  ttsAwsPollyQuickstartDoc,
  ttsAzureSpeechQuickstartDoc,
  babulusLanguageDesignDoc,
  ttsElevenlabsGuideDoc,
  environmentsDoc,
  projectStorageArchitectureDoc,
  projectStorageQuickstartDoc,
  roadmapSaasElectronPlanDoc,
  securityVerificationDoc,
  roadmapSession20260125SummaryDoc,
  roadmapStudioImplementationPlanDoc,
  testCoverageDoc,
  workerJobSpecDoc,
];

export const DOCS: readonly DocsEntry[] = RAW_DOCS.map((doc) => ({
  ...doc,
  html: normalizeDocHtml(doc.html),
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

export function listDocsByCategory() {
  const categories = new Map<DocsCategory, DocsEntry[]>();
  for (const doc of DOCS) {
    const existing = categories.get(doc.category) ?? [];
    existing.push(doc);
    categories.set(doc.category, existing);
  }
  return Array.from(categories.entries()).map(([category, docs]) => ({
    category,
    docs: docs.slice().sort((a, b) => a.title.localeCompare(b.title)),
  }));
}
