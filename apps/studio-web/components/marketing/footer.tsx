import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-recess py-10">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Babulus is in private preview. Join the waitlist for early access and progress updates.
            {" "}
            <a href="/waitlist" className="font-medium underline underline-offset-4">
              Join waitlist
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a
            href="https://github.com/anthusai/babulus"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            View Source
          </a>
        </div>
      </div>
    </footer>
  );
}
