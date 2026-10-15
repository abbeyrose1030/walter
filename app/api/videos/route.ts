import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isTeacherAuthorized } from "@/lib/auth";
import { appendVideo, readVideosIndex } from "@/lib/videos";

export async function GET(request: NextRequest) {
  const videos = await readVideosIndex();
  const teacher = isTeacherAuthorized(request);
  if (teacher) {
    return NextResponse.json({ videos });
  }
  return NextResponse.json({
    videos: videos.map((v) => ({
      id: v.id,
      songTitle: v.songTitle,
      uploadedAt: v.uploadedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Storage not configured (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("video");
  const songId = String(form.get("songId") || "");
  const songTitle = String(form.get("songTitle") || "Song");
  const studentName = String(form.get("studentName") || "Ava");

  if (!(file instanceof File) || !songId) {
    return NextResponse.json(
      { error: "Video and songId required" },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const pathname = `videos/${id}.webm`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || "video/webm",
  });

  const entry = {
    id,
    songId,
    songTitle,
    studentName,
    url: blob.url,
    uploadedAt: new Date().toISOString(),
  };

  await appendVideo(entry);
  return NextResponse.json({ video: entry });
}
