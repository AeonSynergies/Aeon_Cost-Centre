import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role, departmentId: session.user.departmentId });
}
