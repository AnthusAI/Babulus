import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { docsHref, listDocsByCategory, type DocsEntry } from "@/lib/docs-registry";

function DocsNavItem({ doc, isActive }: { doc: DocsEntry; isActive: boolean }) {
  return (
    <Link
      href={docsHref(doc)}
      className={cn(
        "rounded-lg px-3 py-2 text-sm transition-colors",
        isActive ? "bg-background text-foreground" : "text-foreground/60 hover:text-foreground/80"
      )}
    >
      {doc.title}
    </Link>
  );
}

export function DocsShell({
  activeSlug,
  children,
}: {
  activeSlug?: readonly string[];
  children: ReactNode;
}) {
  const activeKey = activeSlug?.join("/") ?? null;
  const sections = listDocsByCategory({ includeInternal: false });
  const internalDocs = activeSlug
    ? listDocsByCategory({ includeInternal: true })
        .flatMap((section) => section.docs)
        .filter((doc) => doc.internal)
    : [];

  return (
    <div className="bg-recess">
      <div className="container py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-[260px_1fr_220px]">
          <aside className="hidden md:block">
            <div className="rounded-2xl bg-card p-2">
              <div className="rounded-xl bg-background p-2">
                <div className="space-y-6 p-2">
                  {sections.map(({ category, docs }) => (
                    <div key={category} className="space-y-2">
                      <div className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                        {category}
                      </div>
                      <div className="flex flex-col gap-1">
                        {docs.map((doc) => (
                          <DocsNavItem
                            key={doc.slug.join("/")}
                            doc={doc}
                            isActive={activeKey === doc.slug.join("/")}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {internalDocs.length ? (
                    <div className="space-y-2 pt-2">
                      <div className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                        Internal
                      </div>
                      <div className="flex flex-col gap-1">
                        {internalDocs.map((doc) => (
                          <DocsNavItem
                            key={doc.slug.join("/")}
                            doc={doc}
                            isActive={activeKey === doc.slug.join("/")}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
          <div className="min-w-0">{children}</div>
          <aside className="hidden md:block">
            <div className="rounded-2xl bg-card p-2">
              <div className="rounded-xl bg-background p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                  Theme Library
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <Link
                    href="/docs/components/layouts"
                    className="rounded-lg px-3 py-2 text-sm text-foreground/60 transition-colors hover:text-foreground/80"
                  >
                    Layouts
                  </Link>
                  <Link
                    href="/docs/components/typography"
                    className="rounded-lg px-3 py-2 text-sm text-foreground/60 transition-colors hover:text-foreground/80"
                  >
                    Typography Schemes
                  </Link>
                  <Link
                    href="/docs/components/colors"
                    className="rounded-lg px-3 py-2 text-sm text-foreground/60 transition-colors hover:text-foreground/80"
                  >
                    Color Schemes
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
