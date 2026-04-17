import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  jobsService,
  type Job,
  type JobStatus,
  type JobAttempt,
  type JobRetryPolicy,
} from "@/services/jobsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RefreshCw, RotateCcw, PlayCircle, Filter, Skull, History, Settings2,
} from "lucide-react";

type FilterStatus = "all" | JobStatus | "retrying";

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  processing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  dead: "bg-foreground/10 text-foreground border-foreground/40",
};

const ATTEMPT_COLORS: Record<JobAttempt["status"], string> = {
  started: "bg-muted text-muted-foreground border-border",
  succeeded: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  dead: "bg-foreground/10 text-foreground border-foreground/40",
};

export default function QueueManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [historyJob, setHistoryJob] = useState<Job | null>(null);
  const [attempts, setAttempts] = useState<JobAttempt[]>([]);

  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [policies, setPolicies] = useState<JobRetryPolicy[]>([]);

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
    return jobs.filter((j) => {
      if (typeFilter !== "all" && j.type !== typeFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "retrying") return j.status === "pending" && (j.attempts ?? 0) > 0;
      return j.status === statusFilter;
    });
  }, [jobs, statusFilter, typeFilter]);

  const types = useMemo(() => Array.from(new Set(jobs.map((j) => j.type))), [jobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending" && (j.attempts ?? 0) === 0).length,
    retrying: jobs.filter((j) => j.status === "pending" && (j.attempts ?? 0) > 0).length,
    processing: jobs.filter((j) => j.status === "processing").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    dead: jobs.filter((j) => j.status === "dead").length,
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

  const reviveDead = async (id: string) => {
    setBusyId(id);
    try {
      await jobsService.reviveDead(id);
      toast.success("Dead job manually revived");
    } catch (e: any) {
      toast.error(e.message || "Revive failed");
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

  const openHistory = async (job: Job) => {
    setHistoryJob(job);
    setAttempts([]);
    try {
      const a = await jobsService.attempts(job.id);
      setAttempts(a);
    } catch (e: any) {
      toast.error(e.message || "Failed to load attempts");
    }
  };

  const openPolicies = async () => {
    setPoliciesOpen(true);
    try {
      const p = await jobsService.listPolicies();
      setPolicies(p);
    } catch (e: any) {
      toast.error(e.message || "Failed to load policies");
    }
  };

  const updatePolicy = async (p: JobRetryPolicy, patch: Partial<JobRetryPolicy>) => {
    const next = { ...p, ...patch };
    setPolicies((prev) => prev.map((x) => (x.job_type === p.job_type ? next : x)));
    try {
      await jobsService.upsertPolicy({
        job_type: next.job_type,
        max_attempts: next.max_attempts,
        backoff_seconds: next.backoff_seconds,
        enabled: next.enabled,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to save policy");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Manager</h1>
          <p className="text-muted-foreground">Background jobs, retries &amp; dead letter queue</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openPolicies}>
            <Settings2 className="h-4 w-4 mr-2" /> Retry Policies
          </Button>
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
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        {([
          ["Total", stats.total, "text-foreground"],
          ["Pending", stats.pending, "text-amber-500"],
          ["Retrying", stats.retrying, "text-amber-500"],
          ["Processing", stats.processing, "text-blue-500"],
          ["Completed", stats.completed, "text-emerald-500"],
          ["Failed", stats.failed, "text-destructive"],
          ["Dead", stats.dead, "text-foreground"],
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
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="dead">Dead</SelectItem>
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
              {filtered.map((j) => {
                const isRetrying = j.status === "pending" && (j.attempts ?? 0) > 0;
                return (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">{j.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[j.status]}>
                        {isRetrying ? "retrying" : j.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{j.attempts}/{j.max_attempts}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(j.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-destructive">
                      {j.error || "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openHistory(j)} title="View attempts">
                        <History className="h-3 w-3" />
                      </Button>
                      {j.status === "failed" && (
                        <Button size="sm" variant="outline" disabled={busyId === j.id} onClick={() => retryJob(j.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                      )}
                      {j.status === "dead" && (
                        <Button size="sm" variant="outline" disabled={busyId === j.id} onClick={() => reviveDead(j.id)}>
                          <Skull className="h-3 w-3 mr-1" /> Retry Dead (manual)
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attempts timeline */}
      <Dialog open={!!historyJob} onOpenChange={(o) => !o && setHistoryJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Attempt history — <span className="font-mono text-sm">{historyJob?.type}</span>
            </DialogTitle>
          </DialogHeader>
          {attempts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No attempt records yet.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {attempts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 border rounded-md p-3">
                  <Badge variant="outline" className={ATTEMPT_COLORS[a.status]}>
                    #{a.attempt} {a.status}
                  </Badge>
                  <div className="flex-1 text-sm">
                    <div className="text-muted-foreground text-xs">
                      {new Date(a.created_at).toLocaleString()}
                      {a.duration_ms != null && ` · ${a.duration_ms}ms`}
                    </div>
                    {a.error && <div className="text-destructive text-xs mt-1">{a.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Retry policies */}
      <Dialog open={policiesOpen} onOpenChange={setPoliciesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Per-type retry policies</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job type</TableHead>
                <TableHead>Max attempts</TableHead>
                <TableHead>Backoff (s)</TableHead>
                <TableHead>Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.job_type}>
                  <TableCell className="font-mono text-xs">{p.job_type}</TableCell>
                  <TableCell>
                    <Input
                      type="number" min={1} max={20}
                      className="w-20"
                      value={p.max_attempts}
                      onChange={(e) => updatePolicy(p, { max_attempts: parseInt(e.target.value || "1", 10) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0}
                      className="w-24"
                      value={p.backoff_seconds}
                      onChange={(e) => updatePolicy(p, { backoff_seconds: parseInt(e.target.value || "0", 10) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.enabled}
                      onCheckedChange={(v) => updatePolicy(p, { enabled: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {policies.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No policies configured
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
