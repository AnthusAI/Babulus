import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DocsContent({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "text-foreground/90",
        "[&_h1]:font-heading [&_h1]:text-3xl [&_h1]:leading-tight [&_h1]:tracking-tight",
        "[&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:tracking-tight",
        "[&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-snug",
        "[&_p]:mt-4 [&_p]:leading-7 [&_p]:text-muted-foreground",
        "[&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5",
        "[&_ol]:mt-4 [&_ol]:space-y-2 [&_ol]:pl-5",
        "[&_li]:text-muted-foreground [&_li]:leading-7",
        "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-foreground/80",
        "[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4",
        "[&_pre_a]:no-underline [&_pre_a]:text-muted-foreground [&_pre_a]:opacity-70",
        "[&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:text-[0.85em]",
        "[&_hr]:my-10 [&_hr]:h-3 [&_hr]:rounded-full [&_hr]:bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}
