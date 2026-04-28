import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/contexts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { login, register } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("alex@wagr.dev");
  const [password, setPassword] = useState("password123");
  const [displayName, setDisplayName] = useState("New User");
  const [username, setUsername] = useState("new_user");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Login" : "Create account"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          {mode === "register" && (
            <>
              <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
              <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
            </>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Button
            className="w-full"
            onClick={async () => {
              setError(null);
              try {
                if (mode === "login") await login(email, password);
                else await register({ email, password, displayName, username });
                window.location.replace("/");
              } catch (e: any) {
                setError(e?.message ?? "Authentication failed");
              }
            }}
          >
            {mode === "login" ? "Login" : "Create account"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}>
            {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
