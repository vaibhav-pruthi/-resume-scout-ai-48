import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: CandidatesPage,
});

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  analyses: { ats_score: number; recommendation: string }[];
};

function CandidatesPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["candidates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, name, email, status, created_at, analyses(ats_score, recommendation)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? [])
      .filter((c) =>
        s
          ? (c.name ?? "").toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s)
          : true,
      )
      .sort((a, b) => (b.analyses?.[0]?.ats_score ?? 0) - (a.analyses?.[0]?.ats_score ?? 0));
  }, [data, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">Ranked by ATS score.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            className="w-72 pl-9"
          />
        </div>
      </div>

      <div className="glass shadow-elegant overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">ATS</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No candidates yet.{" "}
                  <Link to="/upload" className="text-foreground underline">
                    Upload one
                  </Link>
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link to="/candidates/$id" params={{ id: c.id }} className="font-medium hover:underline">
                    {c.name ?? "Unnamed"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <ScorePill score={c.analyses?.[0]?.ats_score ?? 0} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  if (!score) return <span className="text-muted-foreground">—</span>;
  const tone =
    score >= 80 ? "bg-success/15 text-success" : score >= 60 ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{score}</span>;
}
