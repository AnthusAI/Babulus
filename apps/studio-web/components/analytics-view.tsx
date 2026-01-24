"use client";

import { useUsageEvents, useBillingAccount } from "@/lib/use-org-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
            <div className="text-2xl font-bold">{totalGenerations}</div>
            <p className="text-xs text-muted-foreground">AI asset generations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renders</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRenders}</div>
            <p className="text-xs text-muted-foreground">Video render jobs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No usage events recorded.
                    </TableCell>
                </TableRow>
              ) : (
                events.slice(0, 50).map((event) => (
                    <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">
                        {format(new Date(event.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                            {event.unitType}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {event.provider || "System"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                        {event.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                        {isRedacted 
                            ? `${Math.ceil((event.actualCost || event.estimatedCost || 0) * 100)} Credits`
                            : `$${(event.actualCost || event.estimatedCost || 0).toFixed(6)}`
                        }
                    </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
