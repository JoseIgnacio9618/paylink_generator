import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "online",
    checkedAt: new Date().toISOString(),
  });
}
