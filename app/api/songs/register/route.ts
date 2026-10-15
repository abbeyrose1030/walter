import { NextRequest, NextResponse } from "next/server";
import { isTeacherAuthorized } from "@/lib/auth";
import { isBlobStorageConfigured } from "@/lib/blob-storage";
import { registerUploadedSong } from "@/lib/songs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isTeacherAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: "Storage not configured on Vercel." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    url?: string;
  };

  const title = body.title?.trim() ?? "";
  const url = body.url?.trim() ?? "";

  if (!title || !url) {
    return NextResponse.json(
      { error: "Title and file URL required" },
      { status: 400 },
    );
  }

  try {
    const song = await registerUploadedSong(title, url);
    return NextResponse.json({ song });
  } catch (err) {
    console.error("register song failed:", err);
    return NextResponse.json({ error: "Could not save song" }, { status: 500 });
  }
}
