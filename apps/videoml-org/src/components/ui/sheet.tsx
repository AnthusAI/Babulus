import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { cn } from "./utils";

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;

const SheetPortal = ({ className, ...props }: Dialog.DialogPortalProps) => (
  <Dialog.Portal className={cn(className)} {...props} />
);
SheetPortal.displayName = "SheetPortal";

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[rgba(15,17,19,0.35)]",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = Dialog.Overlay.displayName;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed right-0 top-0 z-50 h-full w-72 bg-[var(--bg-surface)] p-6",
        className,
      )}
      {...props}
    >
      {children}
    </Dialog.Content>
  </SheetPortal>
));
SheetContent.displayName = Dialog.Content.displayName;

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn("text-base font-semibold", className)}
    {...props}
  />
));
SheetTitle.displayName = Dialog.Title.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
