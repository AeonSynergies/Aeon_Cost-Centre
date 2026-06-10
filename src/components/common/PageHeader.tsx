"use client";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-3">
      <div>
        <h1 className="text-[22px] font-bold text-[#0F1629]">{title}</h1>
        {subtitle && <p className="text-[12px] text-[#64748B]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
