import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Linkedin,
  Loader2,
  Sparkles,
  History,
  StickyNote,
  Save,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { analyzeResume } from "@/lib/resumes.functions";
import { StatusBadge } from "./dashboard";

type StatusValue = "shortlisted" | "review" | "rejected" | "pending";

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: "shortlisted", label: "Shortlisted" },
  { value: "review", label: "Review" },
  { value: "rejected", label: "Rejected" },
  { value: "pending", label: "Pending" },
];

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  component: CandidateDetail,
});

type Analysis = {
  id: string;
  ats_score: number;
  technical_score: number;
  communication_score: number;
  experience_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  interview_questions: string[];
  recommendation: string;
  summary: string | null;
  job_description: string;
  created_at: string;
  linkedin_url: string | null;
  linkedin_summary: string | null;
};

type HistoryRow = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
};

function CandidateDetail() {
  const { id } = Route.useParams();
  const { session, user } = useAuth();
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzeResume);

  const { data, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      const [c, a, h] = await Promise.all([
        supabase.from("candidates").select("*").eq("id", id).single(),
        supabase
          .from("analyses")
          .select("*")
          .eq("candidate_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("candidate_status_history" as any)
          .select("*")
          .eq("candidate_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (c.error) throw c.error;
      return {
        candidate: c.data,
        analysis: (a.data as Analysis | null) ?? null,
        history: ((h.data as any) ?? []) as HistoryRow[],
      };
    },
  });

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinSummary, setLinkedinSummary] = useState("");
  const [reanalyzing, setReanalyzing] = useState(false);

  // Status change dialog state
  const [pendingStatus, setPendingStatus] = useState<StatusValue | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // HR notes
  const [hrNotes, setHrNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const confirmStatusChange = async () => {
    if (!data || !pendingStatus || !user) return;
    const previous = data.candidate.status;
    if (previous === pendingStatus) {
      setPendingStatus(null);
      return;
    }
    try {
      setSavingStatus(true);
      const { error: updErr } = await supabase
        .from("candidates")
        .update({ status: pendingStatus })
        .eq("id", id);
      if (updErr) throw updErr;

      const { error: histErr } = await supabase
        .from("candidate_status_history" as any)
        .insert({
          candidate_id: id,
          user_id: user.id,
          previous_status: previous,
          new_status: pendingStatus,
          note: changeNote.trim() || null,
        });
      if (histErr) throw histErr;

      toast.success(`Status updated to ${pendingStatus}`);
      setPendingStatus(null);
      setChangeNote("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["candidate", id] }),
        qc.invalidateQueries({ queryKey: ["candidates"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    try {
      setSavingNotes(true);
      const { error } = await supabase
        .from("candidates")
        .update({ hr_notes: (hrNotes ?? "").trim() || null } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Notes saved");
      await qc.invalidateQueries({ queryKey: ["candidate", id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return null;
  const { candidate, analysis, history } = data;
  const currentNotes = hrNotes ?? (candidate as any).hr_notes ?? "";
  const effectiveUrl = linkedinUrl || candidate.linkedin_url || "";
  const effectiveSummary = linkedinSummary || candidate.linkedin_summary || "";

  const reanalyze = async () => {
    if (!session || !analysis) return;
    if (!effectiveUrl && !effectiveSummary.trim()) {
      toast.error("Add a LinkedIn URL or paste profile text first.");
      return;
    }
    try {
      setReanalyzing(true);
      const res = await analyzeFn({
        data: {
          accessToken: session.access_token,
          candidateId: candidate.id,
          jobDescription: analysis.job_description,
          linkedinUrl: effectiveUrl || undefined,
          linkedinSummary: effectiveSummary || undefined,
        },
      });
      toast.success(`Re-analyzed with LinkedIn · ATS ${res.atsScore}/100`);
      await qc.invalidateQueries({ queryKey: ["candidate", id] });
      setLinkedinUrl("");
      setLinkedinSummary("");
    } catch (e: any) {
      toast.error(e?.message ?? "Re-analysis failed");
    } finally {
      setReanalyzing(false);
    }
  };

  const radar = analysis
    ? [
        { k: "ATS", v: analysis.ats_score },
        { k: "Technical", v: analysis.technical_score },
        { k: "Experience", v: analysis.experience_score },
        { k: "Communication", v: analysis.communication_score },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/candidates">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="glass shadow-elegant rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {candidate.name ?? "Unnamed candidate"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {candidate.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {candidate.email}
                </span>
              )}
              {candidate.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {candidate.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> {candidate.file_name}
              </span>
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-foreground hover:underline"
                >
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
            </div>
          </div>
          <div className="flex w-full max-w-sm flex-col items-stretch gap-2 sm:w-auto">
            <div className="flex justify-end">
              <StatusBadge status={candidate.status} />
            </div>
            <div className="flex gap-2">
              <Select
                value={candidate.status}
                onValueChange={(v) => setPendingStatus(v as StatusValue)}
                disabled={savingStatus}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-right text-[11px] text-muted-foreground">
              HR override · separate from AI recommendation
            </p>
          </div>
        </div>
      </div>

      {/* AI vs HR side-by-side */}
      {analysis && (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div className="glass shadow-elegant rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                AI recommendation
              </h3>
            </div>
            <p className="text-gradient mt-3 text-2xl font-bold capitalize">
              {analysis.recommendation.replace("_", " ")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Maps to suggested status:{" "}
              <span className="font-medium capitalize text-foreground">
                {recommendationToStatus(analysis.recommendation)}
              </span>
            </p>
            <div className="mt-3">
              <StatusBadge status={recommendationToStatus(analysis.recommendation)} />
            </div>
          </div>

          <div className="hidden items-center justify-center text-2xl text-muted-foreground sm:flex">
            →
          </div>

          <div className="glass shadow-elegant rounded-2xl border-primary/30 p-6">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                HR final status
              </h3>
            </div>
            <p className="mt-3 text-2xl font-bold capitalize">{candidate.status}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {candidate.status === recommendationToStatus(analysis.recommendation)
                ? "Matches AI recommendation."
                : "Manually overridden by HR."}
            </p>
            <div className="mt-3">
              <StatusBadge status={candidate.status} />
            </div>
          </div>
        </div>
      )}

      {/* HR Notes */}
      <div className="glass shadow-elegant rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">HR notes</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Private comments visible only to your team.
        </p>
        <Textarea
          rows={4}
          className="mt-3"
          placeholder="Write your impressions, interview feedback, follow-ups…"
          value={currentNotes}
          onChange={(e) => setHrNotes(e.target.value)}
          maxLength={5000}
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={saveNotes} disabled={savingNotes} size="sm">
            {savingNotes ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save notes
          </Button>
        </div>
      </div>

      {/* Status history */}
      <div className="glass shadow-elegant rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Status history</h2>
        </div>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No status changes yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/40 p-3 text-sm"
              >
                <StatusBadge status={h.previous_status ?? "pending"} />
                <span className="text-muted-foreground">→</span>
                <StatusBadge status={h.new_status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()}
                </span>
                {h.note && (
                  <p className="w-full text-xs text-muted-foreground">“{h.note}”</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass shadow-elegant rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Linkedin className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Re-analyze with LinkedIn</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the candidate&apos;s LinkedIn URL and paste the About / Experience text. The AI will
          cross-check it against the resume and update the ATS score and recommendation.
        </p>
        <div className="mt-4 grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="li-url">LinkedIn URL</Label>
            <Input
              id="li-url"
              type="url"
              placeholder={candidate.linkedin_url ?? "https://www.linkedin.com/in/username"}
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="li-sum">Profile text</Label>
            <Textarea
              id="li-sum"
              rows={5}
              placeholder={
                candidate.linkedin_summary
                  ? "Previously saved — leave blank to reuse, or paste new text."
                  : "Paste the About + Experience sections from LinkedIn."
              }
              value={linkedinSummary}
              onChange={(e) => setLinkedinSummary(e.target.value)}
              maxLength={15000}
            />
          </div>
          <div>
            <Button
              onClick={reanalyze}
              disabled={reanalyzing || !analysis}
              className="bg-gradient-primary shadow-elegant"
            >
              {reanalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {reanalyzing ? "Re-analyzing…" : "Re-analyze with LinkedIn"}
            </Button>
            {!analysis && (
              <p className="mt-2 text-xs text-muted-foreground">
                Run the initial analysis first.
              </p>
            )}
          </div>
        </div>
      </div>

      {!analysis ? (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
          No analysis available for this candidate yet.
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="glass shadow-elegant rounded-2xl p-6 lg:col-span-1">
              <h2 className="font-semibold">Score breakdown</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer>
                  <RadarChart data={radar}>
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis dataKey="k" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      dataKey="v"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
                <Stat label="ATS" v={analysis.ats_score} />
                <Stat label="Technical" v={analysis.technical_score} />
                <Stat label="Experience" v={analysis.experience_score} />
                <Stat label="Communication" v={analysis.communication_score} />
              </div>
            </div>

            <div className="glass shadow-elegant rounded-2xl p-6 lg:col-span-2">
              <h2 className="font-semibold">AI recommendation</h2>
              <p className="text-gradient mt-2 text-2xl font-bold capitalize">
                {analysis.recommendation.replace("_", " ")}
              </p>
              {analysis.summary && (
                <p className="mt-3 text-sm text-muted-foreground">{analysis.summary}</p>
              )}

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <List title="Strengths" items={analysis.strengths} tone="success" />
                <List title="Weaknesses" items={analysis.weaknesses} tone="destructive" />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold">Missing skills</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.missing_skills.length === 0 && (
                    <span className="text-xs text-muted-foreground">None detected</span>
                  )}
                  {analysis.missing_skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border bg-warning/10 px-2.5 py-1 text-xs text-warning-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass shadow-elegant rounded-2xl p-6">
            <h2 className="font-semibold">Suggested interview questions</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {analysis.interview_questions.map((q, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-gradient w-6 shrink-0 font-bold">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </div>

          <details className="glass rounded-2xl p-6">
            <summary className="cursor-pointer font-semibold">Job description used</summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">
              {analysis.job_description}
            </pre>
          </details>
        </>
      )}

      {/* Confirm status change dialog */}
      <Dialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open && !savingStatus) {
            setPendingStatus(null);
            setChangeNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm status change</DialogTitle>
            <DialogDescription>
              Change status from{" "}
              <span className="font-semibold capitalize">{candidate.status}</span> to{" "}
              <span className="font-semibold capitalize">{pendingStatus}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="change-note">Reason (optional)</Label>
            <Textarea
              id="change-note"
              rows={3}
              placeholder="Why are you changing this status?"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPendingStatus(null);
                setChangeNote("");
              }}
              disabled={savingStatus}
            >
              Cancel
            </Button>
            <Button onClick={confirmStatusChange} disabled={savingStatus}>
              {savingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-gradient text-xl font-bold">{v}</div>
    </div>
  );
}

function List({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "destructive";
}) {
  const dot = tone === "success" ? "bg-success" : "bg-destructive";
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.length === 0 && <li className="text-xs text-muted-foreground">None</li>}
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
