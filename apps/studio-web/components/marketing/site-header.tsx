"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function SiteHeader() {
  const { setTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full bg-recess/95 backdrop-blur supports-[backdrop-filter]:bg-recess/70">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Babulus</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="#how-it-works"
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
              href="#control"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Control
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="mr-2"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
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
