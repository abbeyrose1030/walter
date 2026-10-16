import { NextRequest, NextResponse } from "next/server";
import { STUDENT_NAME } from "@/lib/branding";
import { isBlobStorageConfigured } from "@/lib/blob-storage";
import { registerPracticeVideo } from "@/lib/videos";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: "Storage not configured on Vercel." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    songId?: string;
    songTitle?: string;
    studentName?: string;
    url?: string;
  };

  const songId = body.songId?.trim() ?? "";
  const songTitle = body.songTitle?.trim() || "Song";
  const studentName = body.studentName?.trim() || STUDENT_NAME;
  const url = body.url?.trim() ?? "";
  const id = body.id?.trim() || crypto.randomUUID();

  if (!songId || !url) {
    return NextResponse.json(
      { error: "Recording data incomplete" },
      { status: 400 },
    );
  }

  try {
    const video = await registerPracticeVideo({
      id,
      songId,
      songTitle,
      studentName,
      url,
      uploadedAt: new Date().toISOString(),
    });
    return NextResponse.json({ video });
  } catch (err) {
    console.error("Video register failed:", err);
    const detail =
      err instanceof Error ? err.message : "Could not save your video.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
