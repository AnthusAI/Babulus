"use client";

import { useState, useEffect } from "react";
import { useOrgs } from "@/lib/use-org-data";
import { ProjectList } from "./project-list";
import { VideoList } from "./video-list";
import { VideoEditor } from "./video-editor";
import { AnalyticsView } from "./analytics-view";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home, Plus, BarChart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateOrgDialog } from "./create-org-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function StudioDashboard() {
  const { orgs, loading: orgsLoading, refetch: refetchOrgs } = useOrgs();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("projects");

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

  const handleHome = () => {
    setSelectedProjectId(null);
    setSelectedVideoId(null);
    setActiveTab("projects");
  };

  const handleBackToVideos = () => {
    setSelectedVideoId(null);
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
       <div className="flex items-center justify-between p-4 border-b bg-card">
         <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={handleHome} title="Home">
             <Home className="h-4 w-4" />
           </Button>
           
           {selectedProjectId && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button variant="ghost" className="px-2" onClick={handleBackToVideos}>
                  Project
                </Button>
              </>
           )}

           {selectedVideoId && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium px-2">Video</span>
              </>
           )}
         </div>

         <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Organization:</span>
            <Select 
              value={selectedOrgId ?? ""} 
              onValueChange={(val) => {
                if (val === "__new__") {
                  return; // Handled by CreateOrgDialog trigger
                }
                setSelectedOrgId(val);
                setSelectedProjectId(null);
                setSelectedVideoId(null);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
                <div className="p-2 border-t mt-1">
                  <CreateOrgDialog 
                    onOrgCreated={() => {
                      refetchOrgs().then(() => {
                        // The effect will auto-select if it was the first one, 
                        // but we can also handle explicit selection logic here if needed
                      });
                    }}
                    trigger={
                      <Button variant="ghost" size="sm" className="w-full justify-start font-normal h-8 px-2">
                        <Plus className="mr-2 h-4 w-4" />
                        New Organization
                      </Button>
                    }
                  />
                </div>
              </SelectContent>
            </Select>
         </div>
       </div>

       <div className="flex-1 overflow-auto p-6 bg-muted/10">
         {!selectedOrgId ? (
            <div className="flex justify-center p-8 text-muted-foreground">Select an organization to continue.</div>
         ) : !selectedProjectId ? (
           <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
             <div className="flex items-center justify-between mb-4">
               <TabsList>
                 <TabsTrigger value="projects">Projects</TabsTrigger>
                 <TabsTrigger value="analytics">Analytics</TabsTrigger>
               </TabsList>
             </div>
             <TabsContent value="projects" className="flex-1 mt-0">
               <ProjectList 
                 orgId={selectedOrgId} 
                 onSelectProject={handleSelectProject} 
               />
             </TabsContent>
             <TabsContent value="analytics" className="flex-1 mt-0">
               <AnalyticsView orgId={selectedOrgId} />
             </TabsContent>
           </Tabs>
         ) : !selectedVideoId ? (
            <VideoList 
              orgId={selectedOrgId} 
              projectId={selectedProjectId} 
              onSelectVideo={handleSelectVideo}
              selectedVideoId={selectedVideoId}
            />
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
