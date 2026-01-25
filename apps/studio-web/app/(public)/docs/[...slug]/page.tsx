import { notFound } from "next/navigation";
import { DocsShell } from "@/components/docs/docs-shell";
import { DocsContent } from "@/components/docs/docs-content";
import { DOCS, findDocBySlug } from "@/lib/docs-registry";

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug.slice() }));
}

export function generateMetadata({ params }: { params: { slug: string[] } }) {
  const doc = findDocBySlug(params.slug);
  if (!doc) return {};
  return { title: doc.title };
}

export default function DocsPage({ params }: { params: { slug: string[] } }) {
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
        </div>
      </article>
    </DocsShell>
  );
}
