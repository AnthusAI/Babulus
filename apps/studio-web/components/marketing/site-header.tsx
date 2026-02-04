"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const linkClass = (href: string) =>
    [
      "transition-colors px-3 py-2 rounded-md",
      isActive(href)
        ? "text-foreground bg-accent"
        : "text-foreground/60 hover:text-foreground/80 hover:bg-accent",
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 w-full bg-recess/95 backdrop-blur supports-[backdrop-filter]:bg-recess/70">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Babulus</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link
              href="/code-to-video"
              className={linkClass("/code-to-video")}
              aria-current={isActive("/code-to-video") ? "page" : undefined}
            >
              Code to Video
            </Link>
            <Link
              href="/translations"
              className={linkClass("/translations")}
              aria-current={isActive("/translations") ? "page" : undefined}
            >
              Translations
            </Link>
            <Link
              href="/docs"
              className={linkClass("/docs")}
              aria-current={isActive("/docs") ? "page" : undefined}
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
