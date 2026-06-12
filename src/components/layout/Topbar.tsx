"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { initials } from "@/lib/utils";
import { ChangePasswordModal } from "@/components/layout/ChangePasswordModal";

function titleCase(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Topbar({ user }: { user: { name: string } }) {
  const pathname = usePathname();
  const [pwOpen, setPwOpen] = React.useState(false);

  const crumbs = pathname.split("/").filter(Boolean).map(titleCase);

  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-[#E8ECF4] bg-white px-5">
      <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
        {crumbs.length === 0 ? (
          <span className="font-medium text-[#0F1629]">Dashboard</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#CBD5E1]">/</span>}
              <span className={i === crumbs.length - 1 ? "font-medium text-[#0F1629]" : ""}>
                {c}
              </span>
            </span>
          ))
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-1.5 text-[#64748B] hover:bg-[#F1F5F9]">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D85A30]" />
        </button>
        <button
          onClick={() => setPwOpen(true)}
          title="Change password"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3266AD] text-[11px] font-bold text-white"
        >
          {initials(user.name)}
        </button>
      </div>
      <ChangePasswordModal open={pwOpen} onOpenChange={setPwOpen} />
    </header>
  );
}
