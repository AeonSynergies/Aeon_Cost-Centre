import { NextResponse } from "next/server";
import { z } from "zod";
import { setPasswordFromToken } from "@/lib/invite";

const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const result = await setPasswordFromToken(parsed.data.token, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, email: result.email });
}
