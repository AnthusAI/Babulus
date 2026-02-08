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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-transparent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link
              to="/"
              className="mr-6 flex items-center space-x-2 font-heading text-xl font-bold tracking-tight"
            >
              VideoML
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <Link
                to="/specs"
                className="transition-colors hover:text-foreground/80 text-foreground/60 hover:underline decoration-primary underline-offset-4"
                activeClassName="text-foreground underline decoration-primary underline-offset-4"
              >
                Spec
              </Link>
              <Link
                to="/player"
                className="transition-colors hover:text-foreground/80 text-foreground/60 hover:underline decoration-primary underline-offset-4"
                activeClassName="text-foreground underline decoration-primary underline-offset-4"
              >
                Player
              </Link>
              <Link
                to="/docs"
                className="transition-colors hover:text-foreground/80 text-foreground/60 hover:underline decoration-primary underline-offset-4"
                activeClassName="text-foreground underline decoration-primary underline-offset-4"
              >
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
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
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="font-heading text-xl">
                    VideoML
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 py-4">
                  <SheetClose asChild>
                    <Link
                      to="/specs"
                      className="text-sm font-medium hover:underline decoration-primary underline-offset-4"
                    >
                      Specification
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/player"
                      className="text-sm font-medium hover:underline decoration-primary underline-offset-4"
                    >
                      Player
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/docs"
                      className="text-sm font-medium hover:underline decoration-primary underline-offset-4"
                    >
                      Documentation
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6 md:py-10">{children}</main>
      <footer className="py-6 md:px-8 md:py-0 border-t border-border/40">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            VideoML is a draft standard for declarative video composition.
          </p>
        </div>
      </footer>
    </div>
  );
};
