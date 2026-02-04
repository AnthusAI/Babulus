import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DocsShell } from "@/components/docs/docs-shell";
import { DocsContent } from "@/components/docs/docs-content";
import { DocsPreviewMount } from "@/components/docs/docs-preview-mount";
import { TypographyPreviewMount } from "@/components/docs/typography-preview-mount";
import { DOCS, findDocBySlug } from "@/lib/docs-registry";

const legacyRoadmapSlugs: readonly (readonly string[])[] = [
  ["roadmap", "next-steps"],
  ["roadmap", "status"],
  ["roadmap", "saas-electron-plan"],
  ["roadmap", "studio-implementation-plan"],
  ["roadmap", "session-2026-01-25-summary"],
];

const legacyVisionSlugs: readonly (readonly string[])[] = [["vision"]];

export function generateStaticParams() {
  return [...DOCS.map((doc) => doc.slug), ...legacyRoadmapSlugs, ...legacyVisionSlugs].map((slug) => ({
    slug: slug.slice(),
  }));
}

export function generateMetadata({ params }: { params: { slug: string[] } }): Metadata {
  if (params.slug.length > 1 && params.slug[0] === "roadmap") {
    const doc = findDocBySlug(["roadmap"]);
    const description = doc?.description ?? "Roadmap updates and progress notes for Babulus.";
    return {
      title: "Babulus — Roadmap",
      description,
      openGraph: {
        title: "Babulus — Roadmap",
        description,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: "Babulus — Roadmap",
        description,
      },
    };
  }
  if (params.slug[0] === "vision") {
    const doc = findDocBySlug(["introduction"]);
    const description = doc?.description ?? "Product overview for the Babulus AI Video CMS.";
    return {
      title: "Babulus — Introduction",
      description,
      openGraph: {
        title: "Babulus — Introduction",
        description,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: "Babulus — Introduction",
        description,
      },
    };
  }
  const doc = findDocBySlug(params.slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.description,
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: doc.title,
      description: doc.description,
    },
  };
}

export default function DocsPage({ params }: { params: { slug: string[] } }) {
  if (params.slug.length > 1 && params.slug[0] === "roadmap") redirect("/docs/roadmap");
  if (params.slug[0] === "vision") redirect("/docs/introduction");
  const doc = findDocBySlug(params.slug);
  if (!doc) notFound();

  return (
    <DocsShell activeSlug={doc.slug}>
      <article className="rounded-2xl bg-card p-2">
        <div className="rounded-xl bg-background p-6 md:p-10">
          {doc.internal ? (
            <div className="mb-8 rounded-2xl bg-card p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Roadmap & Notes
              </div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                This page is an internal planning note. It may be outdated or incomplete.
              </div>
            </div>
          ) : null}
          <DocsContent>
            {/* eslint-disable-next-line react/no-danger */}
            <div dangerouslySetInnerHTML={{ __html: doc.html }} />
          </DocsContent>
          <DocsPreviewMount />
          <TypographyPreviewMount />
        </div>
      </article>
    </DocsShell>
  );
}
