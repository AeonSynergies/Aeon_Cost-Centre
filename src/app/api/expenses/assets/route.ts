import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const AMORT_MONTHS = 36;

/** Read-only roll-up of every resource asset, with amortisation maths. */
export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;

  const sp = new URL(req.url).searchParams;
  const resourceId = sp.get("resourceId") || "";
  const assetType = sp.get("assetType") || "";
  const status = sp.get("status") || "";

  const assets = await prisma.resourceAsset.findMany({
    where: {
      ...(resourceId ? { resourceId } : {}),
      ...(assetType ? { assetType: assetType as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: { resource: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  const now = Date.now();
  const rows = assets.map((a) => {
    const monthlyAmortInr = a.costInr ? a.costInr / AMORT_MONTHS : 0;
    const monthsSinceIssue = Math.floor((now - new Date(a.issueDate).getTime()) / (30 * 24 * 60 * 60 * 1000));
    const monthsRemaining = a.costInr ? Math.max(0, AMORT_MONTHS - monthsSinceIssue) : 0;
    return {
      id: a.id, resourceName: a.resource.name, assetType: a.assetType, description: a.description,
      serialNumber: a.serialNumber, issueDate: a.issueDate, returnDate: a.returnDate, status: a.status,
      costInr: a.costInr, monthlyAmortInr, monthsRemaining,
    };
  });

  const summary = {
    total: rows.length,
    issued: rows.filter((r) => r.status === "ISSUED").length,
    returned: rows.filter((r) => r.status === "RETURNED").length,
    // Only assets still issued and within their amortisation window contribute.
    monthlyAmortInr: rows.filter((r) => r.status === "ISSUED" && r.monthsRemaining > 0).reduce((s, r) => s + r.monthlyAmortInr, 0),
  };

  return NextResponse.json({ rows, summary });
}
