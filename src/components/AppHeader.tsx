import { Link, useNavigate } from "@tanstack/react-router";
import { Brain, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-elegant">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-gradient text-lg font-bold">HireSense AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Dashboard
              </Link>
              <Link
                to="/upload"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Upload
              </Link>
              <Link
                to="/candidates"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Candidates
              </Link>
              <span className="hidden items-center gap-2 sm:inline-flex">
                <span className="bg-gradient-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground shadow-elegant">
                  {getInitials(getDisplayName(user))}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {getDisplayName(user)}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="mr-1 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary shadow-elegant">
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
