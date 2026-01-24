"use client";

import { useProjects } from "@/lib/use-org-data";
import { CreateProjectDialog } from "./create-project-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectListProps {
  orgId: string;
  selectedProjectId?: string | null;
  onSelectProject: (projectId: string) => void;
}

export function ProjectList({ orgId, selectedProjectId, onSelectProject }: ProjectListProps) {
  const { projects, loading, error, refetch } = useProjects(orgId);

  if (loading && projects.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">Error loading projects: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Projects</h3>
        <CreateProjectDialog orgId={orgId} onProjectCreated={refetch} />
      </div>
      
      {projects.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border rounded-md border-dashed">
          No projects found. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                selectedProjectId === project.id && "bg-accent border-primary"
              )}
              onClick={() => onSelectProject(project.id)}
            >
              <CardHeader className="p-4 flex flex-row items-center gap-2 space-y-0">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium leading-none">
                  {project.name}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
