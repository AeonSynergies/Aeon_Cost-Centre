import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email, role } = session.user;

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-[#E8ECF4] bg-white px-6">
        <div className="text-[13px] font-medium text-[#64748B]">Dashboard</div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[12px] font-semibold text-[#0F1629]">{name}</div>
            <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">
              {role}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3266AD] text-[12px] font-bold text-white">
            {name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="h-[34px] rounded-[7px] border border-[#E8ECF4] px-3 text-[12px] font-medium text-[#64748B] transition-all duration-150 hover:bg-[#F1F5F9]">
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="p-8">
        <h1 className="text-[22px] font-bold text-[#0F1629]">
          Welcome, {name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-[13px] text-[#64748B]">
          Phase 1 foundation is live. You are signed in as{" "}
          <span className="font-mono">{email}</span>.
        </p>

        <div className="mt-6 rounded-card border border-[#E8ECF4] bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
            Foundation status
          </div>
          <ul className="mt-3 space-y-1.5 text-[13px] text-[#0F1629]">
            <li>✓ Calculation engines &amp; unit tests</li>
            <li>✓ Prisma schema &amp; seed</li>
            <li>✓ NextAuth credentials &amp; protected routes</li>
          </ul>
          <p className="mt-4 text-[12px] text-[#94A3B8]">
            Operations, finance and analytical screens arrive in later phases.
          </p>
        </div>
      </main>
    </div>
  );
}
