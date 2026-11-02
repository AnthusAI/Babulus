"use client";

import { AppLayout } from "@/components/app-layout";
import { ProjectList } from "@/components/project-list";
import { AnalyticsView } from "@/components/analytics-view";
import { useOrgs, useProjects } from "@/lib/use-org-data";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { UserNav } from "@/components/user-nav";

export default function OrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { orgs, loading: orgsLoading } = useOrgs();
  const { loading: projectsLoading } = useProjects(orgId);

  const org = orgs.find((o) => o.id === orgId);
  const loading = orgsLoading || projectsLoading;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Breadcrumb Navigation Header */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-4 py-0.5 border-b bg-card">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium font-heading text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Babulus
          </button>
          <div className="flex items-center justify-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" className="h-8 px-2 font-medium">
              <Building2 className="mr-1 h-4 w-4 text-muted-foreground" />
              {org?.name || 'Loading...'}
            </Button>
          </div>
          <UserNav />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-0 bg-muted/10">
          {loading ? (
            <div className="p-8 flex justify-center text-muted-foreground">
              Loading projects...
            </div>
          ) : !org ? (
            <div className="p-8 flex flex-col items-center gap-4">
              <h2 className="text-xl font-semibold">Organization not found</h2>
              <p className="text-muted-foreground">
                The organization with ID {orgId} does not exist or you don't have access to it.
              </p>
            </div>
          ) : (
            <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-2 p-3">
              <div className="min-h-0">
                <ProjectList
                  orgId={orgId}
                  onSelectProject={(projectId) => {
                    router.push(`/projects/${projectId}`);
                  }}
                />
              </div>
              <div className="min-h-0">
                <div className="flex items-center justify-end mb-2 h-8">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Usage</span>
                </div>
                <AnalyticsView orgId={orgId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
