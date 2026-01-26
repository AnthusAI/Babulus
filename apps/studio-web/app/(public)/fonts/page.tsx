import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Typography",
  description: "Typography preview for the Babulus marketing site.",
  openGraph: {
    title: "Typography",
    description: "Typography preview for the Babulus marketing site.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Typography",
    description: "Typography preview for the Babulus marketing site.",
  },
};

export default function FontsPage() {
  return (
    <div className="bg-recess">
      <div className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-10">
          <div className="rounded-2xl bg-card p-2">
            <div className="rounded-xl bg-background p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Typography
              </p>
              <h1 className="mt-3 font-heading text-3xl md:text-5xl leading-[1.05] tracking-tight">
                Impactful Studio
              </h1>
              <p className="mt-4 text-muted-foreground leading-7">
                The selected pairing is <span className="font-medium text-foreground">Bebas Neue</span>{" "}
                for headings and <span className="font-medium text-foreground">Montserrat</span> for
                body text.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-card p-2">
              <div className="rounded-xl bg-background p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                  Headings
                </p>
                <div className="mt-4 space-y-4 font-heading">
                  <div className="text-5xl leading-[0.95] tracking-tight">Videos produced for you.</div>
                  <div className="text-3xl leading-[1.05] tracking-tight">Narration-first. Deterministic.</div>
                  <div className="text-xl leading-[1.1] tracking-tight text-foreground/80">
                    Portable projects, real artifacts.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card p-2">
              <div className="rounded-xl bg-background p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                  Body
                </p>
                <div className="mt-4 space-y-4">
                  <p className="text-foreground/90 leading-7">
                    Babulus treats video as code so agents can operate on it, humans can review it,
                    and everything stays portable and reproducible.
                  </p>
                  <p className="text-muted-foreground leading-7">
                    The goal is a system that keeps producing while you step back, pulling you in
                    only for approvals and taste.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-2">
            <div className="rounded-xl bg-background p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Notes
              </p>
              <p className="mt-4 text-muted-foreground leading-7">
                This page is a quick visual check for typography in the marketing/public shell. The
                canonical font mapping lives in <code>apps/studio-web/app/layout.tsx</code> and the
                CSS variables <code>--font-heading</code> / <code>--font-body</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
