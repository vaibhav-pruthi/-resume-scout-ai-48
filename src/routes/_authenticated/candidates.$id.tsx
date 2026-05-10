import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, FileText } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./dashboard";

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
};

function CandidateDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: async () => {
      const [c, a] = await Promise.all([
        supabase.from("candidates").select("*").eq("id", id).single(),
        supabase
          .from("analyses")
          .select("*")
          .eq("candidate_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (c.error) throw c.error;
      return { candidate: c.data, analysis: (a.data as Analysis | null) ?? null };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return null;
  const { candidate, analysis } = data;

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
            <h1 className="text-3xl font-bold tracking-tight">{candidate.name ?? "Unnamed candidate"}</h1>
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
            </div>
          </div>
          <StatusBadge status={candidate.status} />
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
