import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, FileSearch, Sparkles, Target, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main>
        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="glass shadow-elegant mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Powered by Gemini 2.5 Flash
            </div>
            <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Shortlist resumes in seconds with{" "}
              <span className="text-gradient">an agentic AI recruiter</span>
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground">
              Upload PDFs, paste a job description, and get ATS scores, missing skills,
              tailored interview questions, and a hiring recommendation — automatically.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary shadow-elegant">
                <Link to="/signup">Start free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">I have an account</Link>
              </Button>
            </div>
          </div>

          <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass shadow-elegant group rounded-2xl p-6 transition-transform hover:-translate-y-1"
              >
                <div className="bg-gradient-primary mb-4 flex h-10 w-10 items-center justify-center rounded-lg shadow-glow">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>

          <div className="glass shadow-elegant mt-20 rounded-3xl p-8 sm:p-12">
            <h2 className="text-3xl font-bold">How the agent works</h2>
            <p className="mt-2 text-muted-foreground">
              An autonomous workflow runs end-to-end on every upload.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s} className="rounded-xl border bg-card/50 p-4">
                  <div className="text-gradient text-3xl font-bold">{i + 1}</div>
                  <p className="mt-2 text-sm font-medium">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}

const features = [
  { icon: FileSearch, title: "Smart resume parsing", body: "Extracts name, contact, skills and experience from PDF resumes." },
  { icon: Target, title: "JD matching & ATS score", body: "Compares each candidate to your job description with a 0-100 ATS score." },
  { icon: Brain, title: "Strengths & gaps", body: "Highlights strengths, weaknesses, and missing must-have skills." },
  { icon: Zap, title: "Interview kit", body: "Generates tailored interview questions targeting each candidate's gaps." },
  { icon: Sparkles, title: "Hiring recommendation", body: "Strong hire, hire, review, or reject — with a concise summary." },
  { icon: ShieldCheck, title: "Secure by default", body: "Per-user data isolation, private file storage, and prompt-injection guards." },
];

const steps = [
  "Read uploaded resume",
  "Extract structured candidate data",
  "Compare with job description",
  "Score, rank & recommend",
];
