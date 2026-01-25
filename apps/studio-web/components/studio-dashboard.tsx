"use client";

import { useState, useEffect, useMemo } from "react";
import { useOrgs, useProjects, useVideos, useGenerationRuns, useJobs } from "@/lib/use-org-data";
import { ProjectList } from "./project-list";
import { VideoList } from "./video-list";
import { VideoEditor } from "./video-editor";
import { AnalyticsView } from "./analytics-view";
import { ProjectFileList } from "./project-file-list";
import { AssetManager } from "./asset-manager";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus, Building2, FolderKanban, Film, FileInput } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateOrgDialog } from "./create-org-dialog";
import { UserNav } from "./user-nav";
import { createJobAction } from "@/app/actions";

export function StudioDashboard() {
  const { orgs, loading: orgsLoading, refetch: refetchOrgs } = useOrgs();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const orgName = orgs.find((org) => org.id === selectedOrgId)?.name;
  const { projects } = useProjects(selectedOrgId);
  const { videos } = useVideos(selectedOrgId, selectedProjectId);
  const { runs } = useGenerationRuns(selectedOrgId, selectedVideoId ?? undefined);
  const { jobs, refetch: refetchJobs } = useJobs(selectedOrgId);
  const projectName = projects.find((project) => project.id === selectedProjectId)?.name;
  const videoTitle = videos.find((video) => video.id === selectedVideoId)?.title;
  const latestSucceededRun = useMemo(() => {
    return runs
      .filter((run) => run.status === "succeeded")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [runs]);
  const activeJob = useMemo(() => {
    return jobs.find((job) => {
      let input: any = {};
      try {
        input = job.inputJson ? JSON.parse(job.inputJson) : {};
      } catch (e) {
        // ignore invalid json
      }
      return input.videoId === selectedVideoId && ['queued', 'claimed', 'running'].includes(job.status);
    });
  }, [jobs, selectedVideoId]);

  // Auto-select first org
  useEffect(() => {
    if (orgs.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [orgs, selectedOrgId]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedVideoId(null);
  };

  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  const handleBackToVideos = () => {
    setSelectedVideoId(null);
  };

  const handleRender = async () => {
    if (!selectedOrgId || !selectedVideoId || !latestSucceededRun || activeJob) return;
    try {
      await createJobAction({
        orgId: selectedOrgId,
        kind: "render",
        status: "queued",
        inputJson: JSON.stringify({
          videoId: selectedVideoId,
          generationRunId: latestSucceededRun.id,
        }),
      }, selectedOrgId);
      await refetchJobs();
    } catch (e) {
      console.error("Failed to queue render job", e);
    }
  };

  if (orgsLoading) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading organization data...</div>;
  }

  if (orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <h2 className="text-xl font-semibold">Welcome to Babulus Studio</h2>
        <p className="text-muted-foreground text-center max-w-md">
          To get started, create your first organization. This will be the home for your projects and videos.
        </p>
        <CreateOrgDialog onOrgCreated={refetchOrgs} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
       {/* Breadcrumbs / Navigation Header */}
       <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-4 py-0.5 border-b bg-card">
         <div className="text-sm font-medium text-muted-foreground">Babulus</div>
         <div className="flex items-center justify-center gap-2 min-w-0">
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="sm" className="h-8 px-2 font-medium hover:bg-transparent hover:text-foreground">
                 <Building2 className="mr-1 h-4 w-4 text-muted-foreground" />
                 {orgName ?? "Organization"}
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="start" className="min-w-[200px]">
               {orgs.map((org) => (
                 <DropdownMenuItem
                   key={org.id}
                   onClick={() => {
                     setSelectedOrgId(org.id);
                     setSelectedProjectId(null);
                     setSelectedVideoId(null);
                   }}
                 >
                   {org.name}
                 </DropdownMenuItem>
               ))}
               <CreateOrgDialog
                 onOrgCreated={() => {
                   refetchOrgs().then(() => {
                     // selection handled via state update if needed
                   });
                 }}
                 trigger={
                   <DropdownMenuItem
                     onSelect={(event) => event.preventDefault()}
                   >
                     <Plus className="mr-2 h-4 w-4" />
                     New Organization
                   </DropdownMenuItem>
                 }
               />
             </DropdownMenuContent>
           </DropdownMenu>

           {selectedProjectId && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button variant="ghost" className="px-2" onClick={handleBackToVideos}>
                  <FolderKanban className="mr-1 h-4 w-4 text-muted-foreground" />
                  {projectName ?? "Project"}
                </Button>
              </>
           )}

           {selectedVideoId && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium px-2 inline-flex items-center">
                  <Film className="mr-1 h-4 w-4 text-muted-foreground" />
                  {videoTitle ?? "Video"}
                </span>
              </>
           )}
         </div>

         <div className="flex items-center gap-2">
           {selectedVideoId && (
            <Button
              variant="bare"
              size="sm"
              onClick={handleRender}
              disabled={!latestSucceededRun || !!activeJob}
            >
              <FileInput className="h-4 w-4" />
              Render
            </Button>
          )}
          <UserNav />
        </div>
       </div>

       <div className="flex-1 overflow-auto p-0 bg-muted/10">
         {!selectedOrgId ? (
            <div className="flex justify-center p-8 text-muted-foreground">Select an organization to continue.</div>
         ) : !selectedProjectId ? (
           <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-2">
             <div className="min-h-0">
               <ProjectList 
                 orgId={selectedOrgId} 
                 onSelectProject={handleSelectProject} 
               />
             </div>
            <div className="min-h-0">
              <div className="flex items-center justify-end mb-2 h-8">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Usage</span>
              </div>
              <AnalyticsView orgId={selectedOrgId} />
            </div>
           </div>
         ) : !selectedVideoId ? (
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-auto">
            <div className="min-h-0">
              <VideoList
                orgId={selectedOrgId}
                projectId={selectedProjectId}
                onSelectVideo={handleSelectVideo}
                selectedVideoId={selectedVideoId}
              />
            </div>
            <div className="min-h-0">
              <ProjectFileList
                projectId={selectedProjectId}
                onSelectFile={(relativePath) => {
                  // TODO: Navigate to file editor
                  console.log('Selected file:', relativePath);
                }}
              />
            </div>
            <div className="min-h-0">
              <AssetManager projectId={selectedProjectId} />
            </div>
          </div>
         ) : (
           <VideoEditor
             orgId={selectedOrgId}
             projectId={selectedProjectId}
             videoId={selectedVideoId}
             onBack={handleBackToVideos}
           />
        )}
      </div>
   </div>
 );
}
