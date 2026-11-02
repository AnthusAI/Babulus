import * as React from "react";
import { Link } from "gatsby";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import "../styles/global.css";

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <header className="px-4 md:px-6">
        <div className="mx-auto mt-6 flex w-full max-w-[var(--max-width)] items-center justify-between rounded-lg bg-[var(--bg-surface)] px-4 py-3 md:px-6">
          <Link
            to="/"
            aria-label="VideoML Home"
            className="text-base font-semibold tracking-tight text-[var(--text-primary)]"
          >
            VideoML
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-semibold text-[var(--text-primary)] md:flex">
            <Link to="/specs">Spec</Link>
            <Link to="/player">Player</Link>
            <Link to="/docs">Docs</Link>
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>VideoML</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4 text-sm font-semibold text-[var(--text-primary)]">
                <SheetClose asChild>
                  <Link to="/specs">Spec</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/player">Player</Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/docs">Docs</Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="container">
          <p>
            VideoML is a draft standard for declarative video composition. This
            site is a work in progress.
          </p>
        </div>
      </footer>
    </>
  );
};

