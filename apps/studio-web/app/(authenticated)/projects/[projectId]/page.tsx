"use client";

import { AppLayout } from "@/components/app-layout";
import { VideoList } from "@/components/video-list";
import { AssetManager } from "@/components/asset-manager";
import { useOrgs } from "@/lib/use-org-data";
import { fetchProject } from "@/lib/client-data";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Building2, FolderKanban } from "lucide-react";
import { UserNav } from "@/components/user-nav";
import type { Project } from "@babulus/shared";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Fetch project to get orgId
  const { orgs } = useOrgs();
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      setProjectLoading(true);
      try {
        const proj = await fetchProject(projectId);
        setProject(proj);
      } catch (e) {
        console.error('Failed to load project:', e);
      } finally {
        setProjectLoading(false);
      }
    }
    loadProject();
  }, [projectId]);

  const orgId = project?.orgId || null;
  const org = orgs.find((o) => o.id === orgId);

  // Show video list and asset manager
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 font-medium"
              onClick={() => orgId ? router.push(`/organizations/${orgId}`) : null}
            >
              <Building2 className="mr-1 h-4 w-4 text-muted-foreground" />
              {org?.name || 'Loading...'}
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium px-2 inline-flex items-center">
              <FolderKanban className="mr-1 h-4 w-4 text-muted-foreground" />
              {project?.name || 'Loading...'}
            </span>
          </div>
          <UserNav />
        </div>

        {/* Two-column layout: Videos and Assets */}
        <div className="flex-1 overflow-auto p-0 bg-muted/10">
          {projectLoading ? (
            <div className="p-8 flex justify-center text-muted-foreground">
              Loading project...
            </div>
          ) : !project ? (
            <div className="p-8 flex flex-col items-center gap-4">
              <h2 className="text-xl font-semibold">Project not found</h2>
              <p className="text-muted-foreground">
                The project with ID {projectId} does not exist or you don't have access to it.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3 h-full">
              {/* Left Column: Videos */}
              <div className="overflow-auto">
                <VideoList
                  orgId={orgId!}
                  projectId={projectId}
                  onSelectVideo={(vid) => {
                    router.push(`/editor/${vid}`);
                  }}
                />
              </div>

              {/* Right Column: Assets */}
              <div className="overflow-auto">
                <AssetManager projectId={projectId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
