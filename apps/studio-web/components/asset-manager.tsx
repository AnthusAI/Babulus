"use client";

import { AssetUpload } from "./asset-upload";
import { AssetBrowser } from "./asset-browser";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AssetManagerProps {
  projectId: string;
}

export function AssetManager({ projectId }: AssetManagerProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    // Trigger a refresh of the asset browser
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">Assets</h3>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-4">
          <AssetBrowser key={refreshKey} projectId={projectId} />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <AssetUpload projectId={projectId} onUploadComplete={handleUploadComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
