import { featureStatusFor } from "@/lib/feature-status";

interface FeatureGridProps {
  children: React.ReactNode;
}

export function FeatureGrid({ children }: FeatureGridProps) {
  return (
    <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3 auto-rows-fr">
      {children}
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  /** Key into FEATURE_STATUS_BY_ID (lib/feature-status.ts); the chip shows only while that key has a label. */
  featureId?: string;
}

/** A flat availability chip ("Planned", "Beta", "Early access") driven by lib/feature-status.ts. */
export function FeatureStatusChip({ featureId }: { featureId: string }) {
  const label = featureStatusFor(featureId);
  if (!label) return null;
  return (
    <span className="ml-2 inline-block rounded bg-recess px-1.5 py-0.5 align-middle text-[0.65rem] font-medium uppercase tracking-[0.08em] text-foreground/60">
      {label}
    </span>
  );
}

export function FeatureCard({ title, description, icon, featureId }: FeatureCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card p-2">
      <div className="flex h-full flex-col rounded-lg bg-background px-6 pt-6 pb-4">
        {icon && <div className="mb-4">{icon}</div>}
        <div className="space-y-2">
          <h3 className="font-bold">
            {title}
            {featureId ? <FeatureStatusChip featureId={featureId} /> : null}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
