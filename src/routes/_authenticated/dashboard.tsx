import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle2, XCircle, Trophy, Upload as UploadIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const BAR_COLORS = [
  "hsl(221 83% 60%)",
  "hsl(160 70% 45%)",
  "hsl(38 92% 55%)",
  "hsl(280 70% 60%)",
  "hsl(340 80% 60%)",
  "hsl(190 80% 50%)",
  "hsl(15 85% 60%)",
  "hsl(120 55% 50%)",
];

type Row = {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  analyses: { ats_score: number; recommendation: string }[];
};

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, name, status, created_at, analyses(ats_score, recommendation)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const total = data?.length ?? 0;
  const shortlisted = data?.filter((c) => c.status === "shortlisted").length ?? 0;
  const rejected = data?.filter((c) => c.status === "rejected").length ?? 0;
  const ranked = (data ?? [])
    .map((c) => ({
      name: c.name ?? "Unnamed",
      score: c.analyses?.[0]?.ats_score ?? 0,
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Recruiting overview at a glance.</p>
        </div>
        <Button asChild className="bg-gradient-primary shadow-elegant">
          <Link to="/upload">
            <UploadIcon className="mr-2 h-4 w-4" /> Upload resume
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Candidates" value={total} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Shortlisted" value={shortlisted} tone="success" />
        <StatCard icon={<XCircle className="h-5 w-5" />} label="Rejected" value={rejected} tone="destructive" />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Top ATS score"
          value={ranked[0]?.score ?? 0}
          tone="accent"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass shadow-elegant rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-semibold">Top candidates by ATS score</h2>
          {ranked.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              No analyzed candidates yet. Upload a resume to get started.
            </p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer>
                <BarChart data={ranked}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {ranked.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass shadow-elegant rounded-2xl p-6">
          <h2 className="font-semibold">Recent</h2>
          <ul className="mt-4 space-y-3">
            {isLoading && <li className="text-sm text-muted-foreground">Loading…</li>}
            {!isLoading && data?.length === 0 && (
              <li className="text-sm text-muted-foreground">No candidates yet.</li>
            )}
            {data?.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <Link to="/candidates/$id" params={{ id: c.id }} className="truncate text-sm hover:underline">
                  {c.name ?? "Unnamed candidate"}
                </Link>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "success" | "destructive" | "accent";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "accent"
          ? "text-accent"
          : "text-primary";
  return (
    <div className="glass shadow-elegant rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={toneClass}>{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    shortlisted: { label: "Shortlisted", className: "bg-success/15 text-success border-success/30" },
    rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
    review: { label: "Review", className: "bg-warning/15 text-warning-foreground border-warning/30" },
    pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
  };
  const m = map[status] ?? map.pending;
  return (
    <Badge variant="outline" className={m.className}>
      {m.label}
    </Badge>
  );
}
