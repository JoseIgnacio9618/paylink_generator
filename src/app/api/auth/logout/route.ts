import { NextResponse } from "next/server";
import { clearCurrentSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  await clearCurrentSessionCookie(response);
  return response;
}
