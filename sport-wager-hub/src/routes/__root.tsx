import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AppProvider } from "@/lib/contexts";
import { useApp } from "@/lib/contexts";
import { AppShell } from "@/components/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="inline-flex mt-6 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WAGR — Sports challenges & wagering" },
      { name: "description", content: "Match opponents, lock stakes, schedule games, and settle results — all in one sportsbook-grade dashboard." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppProvider>
      <RootGate />
    </AppProvider>
  );
}

function RootGate() {
  const { isAuthReady, currentUser } = useApp();
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (!isAuthReady) return <div className="min-h-screen bg-background" />;
  if (!currentUser && path !== "/login") {
    if (typeof window !== "undefined") window.location.replace("/login");
    return null;
  }
  if (currentUser && path === "/login") {
    if (typeof window !== "undefined") window.location.replace("/");
    return null;
  }
  if (path === "/login") return <Outlet />;
  return <AppShell><Outlet /></AppShell>;
}
