import { NextRequest, NextResponse } from "next/server";
import { isTeacherAuthorized } from "@/lib/auth";
import {
  blobNotConfiguredMessage,
  isBlobStorageConfigured,
} from "@/lib/blob-storage";
import { addSong, deleteSong, readSongsIndex } from "@/lib/songs";

export const runtime = "nodejs";

export async function GET() {
  const songs = await readSongsIndex();
  return NextResponse.json({ songs });
}

export async function POST(request: NextRequest) {
  if (!isTeacherAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const file = form.get("file");

  if (!title || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Title and audio file required" },
      { status: 400 },
    );
  }

  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: blobNotConfiguredMessage() },
      { status: 503 },
    );
  }

  try {
    const song = await addSong(title, file);
    return NextResponse.json({ song });
  } catch (err) {
    console.error("Song upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Try again or use a smaller MP3." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isTeacherAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const ok = await deleteSong(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
