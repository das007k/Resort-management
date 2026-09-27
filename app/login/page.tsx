"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Login failed");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--sx-nav-bg)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--sx-surface)",
          padding: "2rem",
          borderRadius: 10,
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: "0.9rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem", color: "var(--sx-nav-bg)" }}>StayAxis</h1>
        <p style={{ margin: 0, color: "var(--sx-muted)", fontSize: "0.85rem" }}>Cardamom Rock Resort</p>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.85rem" }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid var(--sx-border)" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.85rem" }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid var(--sx-border)" }}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: "var(--sx-danger)", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.6rem",
            borderRadius: 6,
            border: "none",
            background: "var(--sx-nav-bg)",
            color: "var(--sx-accent)",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
