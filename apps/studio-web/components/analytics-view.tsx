"use client";

import { useUsageEvents, useBillingAccount } from "@/lib/use-org-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Activity, HardDrive } from "lucide-react";

export function AnalyticsView({ orgId }: { orgId: string }) {
  const { events, loading } = useUsageEvents(orgId);
  const { account } = useBillingAccount(orgId);

  // Calculate totals
  const totalCost = events.reduce((sum, e) => sum + (e.actualCost || e.estimatedCost || 0), 0);
  const totalGenerations = events.filter(e => e.provider !== 'babulus-renderer').length;
  const totalRenders = events.filter(e => e.provider === 'babulus-renderer').length;

  const isRedacted = account?.usageVisibilityMode === 'redacted';

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
                {isRedacted ? `${Math.ceil(totalCost * 100)} Credits` : `$${totalCost.toFixed(4)}`}
            </div>
            <p className="text-xs text-muted-foreground">Estimated usage cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{totalGenerations}</div>
            <p className="text-xs text-muted-foreground">AI asset generations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renders</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{totalRenders}</div>
            <p className="text-xs text-muted-foreground">Video render jobs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col divide-y">
            {events.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No usage events recorded.
              </div>
            ) : (
              events.slice(0, 50).map((event) => (
                <div key={event.id} className="flex flex-col gap-1 py-2 px-0 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal">
                        {event.unitType}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(event.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium">
                      {isRedacted 
                        ? `${Math.ceil((event.actualCost || event.estimatedCost || 0) * 100)}`
                        : `$${(event.actualCost || event.estimatedCost || 0).toFixed(4)}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{event.provider || "System"}</span>
                    <span className="font-mono">x{event.quantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
