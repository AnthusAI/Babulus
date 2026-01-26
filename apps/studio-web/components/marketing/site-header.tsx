"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-recess/95 backdrop-blur supports-[backdrop-filter]:bg-recess/70">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Babulus</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/how-it-works"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              How it works
            </Link>
            <Link
              href="#translations"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Translations
            </Link>
            <Link
              href="/docs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Documentation
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/waitlist">
              <Button size="sm">Join waitlist</Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
