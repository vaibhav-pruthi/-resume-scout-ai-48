import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UploadCloud, FileText, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ingestResume, analyzeResume } from "@/lib/resumes.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

type Stage = "idle" | "uploading" | "parsing" | "analyzing" | "done";

function UploadPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const ingest = useServerFn(ingestResume);
  const analyze = useServerFn(analyzeResume);

  const [file, setFile] = useState<File | null>(null);
  const [jd, setJD] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinSummary, setLinkedinSummary] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pick(f);
  }, []);

  const pick = (f: File) => {
    if (f.type !== "application/pdf") {
      toast.error("Only PDF files are supported.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB.");
      return;
    }
    setFile(f);
  };

  const run = async () => {
    if (!file || !user || !session) return;
    if (jd.trim().length < 20) {
      toast.error("Please provide a job description (≥20 chars).");
      return;
    }
    try {
      setStage("uploading");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("resumes").upload(path, file, { contentType: "application/pdf" });
      if (up.error) throw new Error(up.error.message);

      setStage("parsing");
      const candidate = await ingest({
        data: { accessToken: session.access_token, filePath: path, fileName: file.name },
      });

      setStage("analyzing");
      const result = await analyze({
        data: {
          accessToken: session.access_token,
          candidateId: candidate.id,
          jobDescription: jd,
          linkedinUrl: linkedinUrl.trim() || undefined,
          linkedinSummary: linkedinSummary.trim() || undefined,
        },
      });

      setStage("done");
      toast.success(`Analysis complete · ATS ${result.atsScore}/100`);
      navigate({ to: "/candidates/$id", params: { id: candidate.id } });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Something went wrong");
      setStage("idle");
    }
  };

  const busy = stage !== "idle" && stage !== "done";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analyze a resume</h1>
        <p className="text-sm text-muted-foreground">
          Drop a PDF, paste the job description, and let the agent do the rest.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`glass shadow-elegant relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <input
          id="file"
          type="file"
          accept="application/pdf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
          disabled={busy}
        />
        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Drop a PDF resume here</p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse · max 10 MB</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="jd">Job description</Label>
        <Textarea
          id="jd"
          rows={8}
          placeholder="Paste the job description, required skills, seniority, etc."
          value={jd}
          onChange={(e) => setJD(e.target.value)}
          disabled={busy}
          maxLength={20000}
        />
        <p className="text-xs text-muted-foreground">{jd.length} / 20000</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={run}
          disabled={!file || busy}
          size="lg"
          className="bg-gradient-primary shadow-elegant"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {stage === "uploading" && "Uploading…"}
          {stage === "parsing" && "Parsing resume…"}
          {stage === "analyzing" && "AI analysis in progress…"}
          {(stage === "idle" || stage === "done") && "Run AI analysis"}
        </Button>
        {file && !busy && (
          <Button variant="ghost" onClick={() => setFile(null)}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
