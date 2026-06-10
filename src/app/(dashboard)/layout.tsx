import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell user={{ name: session.user.name ?? "User", role: session.user.role ?? "VIEWER" }}>
      {children}
    </AppShell>
  );
}
