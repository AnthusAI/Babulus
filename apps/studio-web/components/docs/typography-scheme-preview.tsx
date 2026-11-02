"use client";

import { useMemo, useState } from "react";
import { COLOR_SCHEMES } from "@videoml/stdlib/tokens";
import { cn } from "@/lib/utils";

type PreviewPayload = {
  eyebrow: string;
  headline: string;
  subhead: string;
  eyebrowFont: string;
  headlineFont: string;
  subheadFont: string;
};

export function TypographySchemePreview({
  payload,
  className,
}: {
  payload: PreviewPayload;
  className?: string;
}) {
  const [schemeId, setSchemeId] = useState("neutral-dark");
  const scheme = useMemo(
    () => COLOR_SCHEMES.find((item) => item.id === schemeId) ?? COLOR_SCHEMES[0],
    [schemeId],
  );

  if (!scheme) return null;

  const palette = scheme.palette;

  return (
    <div
      className={cn("relative rounded-2xl p-4", className)}
      style={{ background: palette.bg }}
    >
      <div className="absolute right-3 top-3">
        <select
          value={schemeId}
          onChange={(event) => setSchemeId(event.target.value)}
          className="rounded-lg bg-transparent px-2 py-1 text-xs font-medium text-foreground/80"
          style={{
            background: palette.surface,
            color: palette.text,
          }}
        >
          {COLOR_SCHEMES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          background: palette.surface,
        }}
      >
        <div
          style={{
            fontFamily: payload.eyebrowFont,
            fontSize: "12px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: palette.textMuted,
            marginBottom: "10px",
          }}
        >
          {payload.eyebrow}
        </div>
        <div
          style={{
            fontFamily: payload.headlineFont,
            fontSize: "28px",
            fontWeight: 700,
            color: palette.text,
            marginBottom: "8px",
          }}
        >
          {payload.headline}
        </div>
        <div
          style={{
            fontFamily: payload.subheadFont,
            fontSize: "16px",
            lineHeight: 1.4,
            color: palette.textMuted,
          }}
        >
          {payload.subhead}
        </div>
      </div>
    </div>
  );
}
