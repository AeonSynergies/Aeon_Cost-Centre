import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/common/Toaster";

/** Wrapper combining the sidebar + topbar around protected page content. */
export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FC]">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={{ name: user.name }} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
