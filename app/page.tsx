import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1>StayAxis</h1>
        <p style={{ color: "var(--sx-muted)" }}>Phase 1 production foundation — Cardamom Rock Resort</p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            padding: "0.6rem 1.2rem",
            background: "var(--sx-nav-bg)",
            color: "var(--sx-accent)",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
