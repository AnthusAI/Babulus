"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_BANNER_HEADING, CONSENT_BANNER_MESSAGE, COOKIE_SETTINGS_HASH } from "@/lib/analytics-config";
import type { BabulusConsent } from "@/lib/consent";

function consent(): BabulusConsent | undefined {
  return (window as unknown as { babulusConsent?: BabulusConsent }).babulusConsent;
}

/**
 * First-party consent banner, ported from Papyrus `render_consent_banner` (markus_renderer/consent.py):
 * shown while no valid choice is stored, Reject all and Accept all share one style, no focus trap, and
 * any link to #cookie-settings (the footer "Cookie settings" link) reopens it. It relies on
 * `window.babulusConsent` from the bootstrap script, so it never shows when analytics is not loaded.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const focusOnOpenRef = useRef(false);

  const openChoices = useCallback(() => {
    if (!consent()) return;
    focusOnOpenRef.current = true;
    setOpen(true);
  }, []);

  useEffect(() => {
    const c = consent();
    if (!c) return;
    if (!c.read() || window.location.hash === COOKIE_SETTINGS_HASH) setOpen(true);

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.(`a[href="${COOKIE_SETTINGS_HASH}"]`);
      if (!anchor) return;
      event.preventDefault();
      openChoices();
    };
    document.addEventListener("click", onClick);
    (window as unknown as { babulusOpenConsentChoices?: () => void }).babulusOpenConsentChoices = openChoices;
    return () => document.removeEventListener("click", onClick);
  }, [openChoices]);

  useEffect(() => {
    if (open && focusOnOpenRef.current) {
      focusOnOpenRef.current = false;
      firstButtonRef.current?.focus();
    }
  }, [open]);

  const choose = (granted: boolean) => {
    const c = consent();
    if (c) {
      c.apply(granted);
      c.save(granted);
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      aria-describedby="babulus-consent-message"
      className="fixed inset-x-0 bottom-0 z-[60] m-4 max-w-[44rem] rounded-2xl bg-card p-5 text-card-foreground md:p-6"
    >
      <h2 className="font-heading text-2xl">{CONSENT_BANNER_HEADING}</h2>
      <p id="babulus-consent-message" className="mt-2 text-sm text-muted-foreground">
        {CONSENT_BANNER_MESSAGE}{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          ref={firstButtonRef}
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1 basis-36"
          onClick={() => choose(false)}
        >
          Reject all
        </Button>
        <Button type="button" variant="secondary" size="lg" className="flex-1 basis-36" onClick={() => choose(true)}>
          Accept all
        </Button>
      </div>
    </div>
  );
}
