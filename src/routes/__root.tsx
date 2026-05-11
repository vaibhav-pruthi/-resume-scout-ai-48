import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass shadow-elegant max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-gradient text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="bg-gradient-primary shadow-elegant mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass shadow-elegant max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-gradient-primary rounded-md px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HireSense AI — Resume & ATS Shortlisting Agent" },
      {
        name: "description",
        content:
          "AI-powered HR assistant that scores resumes against job descriptions, generates ATS scores, and recommends hiring decisions in seconds.",
      },
      { property: "og:title", content: "HireSense AI — Resume & ATS Shortlisting Agent" },
      {
        property: "og:description",
        content: "Agentic AI shortlisting for modern recruiting teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HireSense AI — Resume & ATS Shortlisting Agent" },
      { name: "description", content: "HireSense AI is an intelligent AI-powered Resume & ATS Shortlisting Agent designed to automate and simplify the recruitment process for HR teams and recruiters." },
      { property: "og:description", content: "HireSense AI is an intelligent AI-powered Resume & ATS Shortlisting Agent designed to automate and simplify the recruitment process for HR teams and recruiters." },
      { name: "twitter:description", content: "HireSense AI is an intelligent AI-powered Resume & ATS Shortlisting Agent designed to automate and simplify the recruitment process for HR teams and recruiters." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e3146065-50bf-416d-9e1c-9915bf120406/id-preview-57548a76--10d90faf-ff2b-4191-b3ef-7cce8c349f42.lovable.app-1778474781930.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e3146065-50bf-416d-9e1c-9915bf120406/id-preview-57548a76--10d90faf-ff2b-4191-b3ef-7cce8c349f42.lovable.app-1778474781930.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
