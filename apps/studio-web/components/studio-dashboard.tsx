"use client";

import { useRouter } from "next/navigation";
import { useOrgs } from "@/lib/use-org-data";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";
import { CreateOrgDialog } from "./create-org-dialog";
import { UserNav } from "./user-nav";

export function StudioDashboard() {
  const router = useRouter();
  const { orgs, loading: orgsLoading, refetch: refetchOrgs } = useOrgs();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-4 py-0.5 border-b bg-card">
        <div className="text-sm font-medium text-muted-foreground">Babulus</div>
        <div></div>
        <UserNav />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-0 bg-muted/10">
        {orgsLoading ? (
          <div className="p-8 flex justify-center text-muted-foreground">
            Loading organizations...
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <h2 className="text-xl font-semibold">Welcome to Babulus Studio</h2>
            <p className="text-muted-foreground text-center max-w-md">
              To get started, create your first organization. This will be the home for your projects and videos.
            </p>
            <CreateOrgDialog onOrgCreated={refetchOrgs} />
          </div>
        ) : (
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between h-8">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Organizations</h3>
              <CreateOrgDialog onOrgCreated={refetchOrgs} />
            </div>

            <div className="grid gap-2">
              {orgs.map((org) => (
                <Card
                  key={org.id}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => router.push(`/organizations/${org.id}`)}
                >
                  <CardHeader className="py-2 pr-2 pl-0 flex flex-row items-center gap-2 space-y-0">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium leading-none">
                      {org.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
