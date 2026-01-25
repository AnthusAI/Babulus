"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthenticator } from "@aws-amplify/ui-react"
import { useSettings } from "@/lib/settings-context"

export function UserNav() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const { setOpen } = useSettings();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/01.png" alt={user?.signInDetails?.loginId || "User"} />
            <AvatarFallback>{user?.signInDetails?.loginId?.substring(0, 2).toUpperCase() || "ME"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end" forceMount>
        <DropdownMenuItem onClick={() => setOpen(true)}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
