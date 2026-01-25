export function WaitlistExpectations({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "text-center" : ""}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
        What happens after you join
      </p>
      <ol
        className={[
          "mt-3 grid gap-2 text-sm text-muted-foreground",
          compact ? "mx-auto max-w-xl" : "",
        ].join(" ")}
      >
        <li>
          <span className="font-medium text-foreground/80">1) Confirmation.</span> You’ll see a success message
          right away.
        </li>
        <li>
          <span className="font-medium text-foreground/80">2) Updates (optional).</span> If you opted in, we’ll
          email occasional progress updates.
        </li>
        <li>
          <span className="font-medium text-foreground/80">3) Early access.</span> When spots open, we’ll invite
          people from the waitlist in waves.
        </li>
      </ol>
    </div>
  );
}

