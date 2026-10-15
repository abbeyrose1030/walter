import { NextRequest, NextResponse } from "next/server";
import { getTeacherPassword, isTeacherAuthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
  };
  const password = body.password?.trim() ?? "";

  if (password && password === getTeacherPassword()) {
    return NextResponse.json({ ok: true });
  }

  if (isTeacherAuthorized(request)) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
}
