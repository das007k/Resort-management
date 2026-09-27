import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authService } from "@/domains/identity-access/services/auth-service";
import { getEnv } from "@/platform/config/env";

export default async function DashboardPage() {
  const env = getEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
  const user = await authService.currentUserFromToken(token);

  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 220,
          background: "var(--sx-nav-bg)",
          color: "white",
          padding: "1.5rem 1rem",
        }}
      >
        <div style={{ color: "var(--sx-accent)", fontWeight: 700, marginBottom: "1.5rem" }}>StayAxis</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
          <li>Dashboard</li>
          <li style={{ opacity: 0.5 }}>Reservations (Phase 2)</li>
          <li style={{ opacity: 0.5 }}>Front Desk (Phase 2)</li>
          <li style={{ opacity: 0.5 }}>Housekeeping (Phase 2)</li>
          <li style={{ opacity: 0.5 }}>Reports (Phase 2)</li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: "2rem" }}>
        <h1 style={{ marginTop: 0 }}>Welcome, {user.fullName}</h1>
        <p style={{ color: "var(--sx-muted)" }}>
          Signed in as {user.email}. This is a Phase 1 foundation placeholder — reservations, front desk,
          housekeeping and reporting screens are built in Phase 2 on top of the domain services delivered here.
        </p>
      </main>
    </div>
  );
}
