import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { jobsService, type Job, type JobStatus } from "@/services/jobsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, RotateCcw, PlayCircle, Filter } from "lucide-react";

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  processing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function QueueManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await jobsService.list({ limit: 200 });
      setJobs(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          setJobs((prev) => {
            const newRow = payload.new as any as Job | undefined;
            const oldRow = payload.old as any as Job | undefined;
            if (payload.eventType === "INSERT" && newRow) {
              return [newRow, ...prev.filter((j) => j.id !== newRow.id)];
            }
            if (payload.eventType === "UPDATE" && newRow) {
              return prev.map((j) => (j.id === newRow.id ? newRow : j));
            }
            if (payload.eventType === "DELETE" && oldRow) {
              return prev.filter((j) => j.id !== oldRow.id);
            }
            return prev;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) =>
      (statusFilter === "all" || j.status === statusFilter) &&
      (typeFilter === "all" || j.type === typeFilter)
    );
  }, [jobs, statusFilter, typeFilter]);

  const types = useMemo(() => Array.from(new Set(jobs.map((j) => j.type))), [jobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  }), [jobs]);

  const triggerWorker = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("process-jobs", { body: {} });
      if (error) throw error;
      toast.success("Worker triggered");
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger worker");
    } finally {
      setLoading(false);
    }
  };

  const retryJob = async (id: string) => {
    setBusyId(id);
    try {
      await jobsService.retry(id);
      toast.success("Job re-queued");
    } catch (e: any) {
      toast.error(e.message || "Retry failed");
    } finally {
      setBusyId(null);
    }
  };

  const retryAll = async () => {
    setLoading(true);
    try {
      const n = await jobsService.retryAllFailed();
      toast.success(`Re-queued ${n} failed job(s)`);
    } catch (e: any) {
      toast.error(e.message || "Retry all failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Manager</h1>
          <p className="text-muted-foreground">Background jobs &amp; worker monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={retryAll} disabled={loading || stats.failed === 0}>
            <RotateCcw className="h-4 w-4 mr-2" /> Retry Failed ({stats.failed})
          </Button>
          <Button onClick={triggerWorker} disabled={loading}>
            <PlayCircle className="h-4 w-4 mr-2" /> Run Worker
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {([
          ["Total", stats.total, "text-foreground"],
          ["Pending", stats.pending, "text-amber-500"],
          ["Processing", stats.processing, "text-blue-500"],
          ["Completed", stats.completed, "text-emerald-500"],
          ["Failed", stats.failed, "text-destructive"],
        ] as const).map(([label, value, color]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Jobs
          </CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No jobs match
                </TableCell></TableRow>
              )}
              {filtered.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs">{j.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[j.status]}>{j.status}</Badge>
                  </TableCell>
                  <TableCell>{j.attempts}/{j.max_attempts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(j.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-destructive">
                    {j.error || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {j.status === "failed" && (
                      <Button size="sm" variant="outline" disabled={busyId === j.id} onClick={() => retryJob(j.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
