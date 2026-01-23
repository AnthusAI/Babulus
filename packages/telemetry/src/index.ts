export type UsageUnitType = "chars" | "tokens" | "seconds" | "frames" | "bytes" | "gb-seconds";

export type UsageEvent = {
  unitType: UsageUnitType;
  quantity: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
  provider?: string | null;
};

export type UsageSummary = {
  totalQuantity: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  byUnit: Record<UsageUnitType, { quantity: number; estimatedCost: number; actualCost: number }>;
};

const emptyUnitSummary = () => ({ quantity: 0, estimatedCost: 0, actualCost: 0 });

export function summarizeUsage(events: UsageEvent[]): UsageSummary {
  const byUnit: UsageSummary["byUnit"] = {
    chars: emptyUnitSummary(),
    tokens: emptyUnitSummary(),
    seconds: emptyUnitSummary(),
    frames: emptyUnitSummary(),
    bytes: emptyUnitSummary(),
    "gb-seconds": emptyUnitSummary(),
  };
  let totalQuantity = 0;
  let totalEstimatedCost = 0;
  let totalActualCost = 0;
  for (const event of events) {
    const unit = byUnit[event.unitType] ?? emptyUnitSummary();
    unit.quantity += event.quantity;
    unit.estimatedCost += event.estimatedCost ?? 0;
    unit.actualCost += event.actualCost ?? 0;
    byUnit[event.unitType] = unit;
    totalQuantity += event.quantity;
    totalEstimatedCost += event.estimatedCost ?? 0;
    totalActualCost += event.actualCost ?? 0;
  }
  return { totalQuantity, totalEstimatedCost, totalActualCost, byUnit };
}
