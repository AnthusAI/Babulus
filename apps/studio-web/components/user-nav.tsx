"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useSettings } from "@/lib/settings-context";
import { BookOpen, ChevronDown, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const { setOpen } = useSettings();
  const router = useRouter();
  const loginId = user?.signInDetails?.loginId || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="h-9 gap-2 rounded-xl bg-background px-3 text-foreground/90 hover:bg-background/80"
        >
          <span className="max-w-[18ch] truncate text-sm font-medium">{loginId}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 rounded-xl bg-card p-2" align="end" forceMount>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            router.push("/docs");
          }}
          className="rounded-lg px-3 py-2"
        >
          <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
          Documentation
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className="rounded-lg px-3 py-2"
        >
          <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            signOut();
          }}
          className="rounded-lg px-3 py-2"
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
