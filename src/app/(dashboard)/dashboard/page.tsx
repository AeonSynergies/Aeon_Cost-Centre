import { auth } from "@/lib/auth";
import { Card, SectionTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "there";

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="text-[22px] font-bold text-[#0F1629]">
        Welcome, {name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-[13px] text-[#64748B]">
        Operations module is live. Full dashboard analytics arrive in Phase 4.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Resources", href: "/resources", desc: "People, salaries, assets & assignments" },
          { title: "Departments", href: "/departments", desc: "Teams, heads, cost & P&L" },
          { title: "Cost Centres", href: "/cost-centres", desc: "Tool seat rates" },
          { title: "Services", href: "/services", desc: "Packages & activities" },
          { title: "Clients", href: "/clients", desc: "Contracts, pricing & utilisation" },
        ].map((c) => (
          <a key={c.href} href={c.href}>
            <Card className="p-4 transition-all duration-150 hover:border-[#3266AD]">
              <SectionTitle>{c.title}</SectionTitle>
              <p className="mt-1.5 text-[12px] text-[#64748B]">{c.desc}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
