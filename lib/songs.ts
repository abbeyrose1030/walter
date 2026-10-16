import { list, put, del } from "@vercel/blob";
import { isBlobStorageConfigured } from "@/lib/blob-storage";

export type Song = {
  id: string;
  title: string;
  url: string;
  uploadedAt: string;
};

const SONGS_INDEX = "songs/index.json";

/** Removed bundled demo track — hide if it ever landed in the Blob index. */
function withoutLegacyDemoTrack(songs: Song[]): Song[] {
  return songs.filter(
    (s) =>
      s.id !== "full-practice-track" &&
      s.title.trim().toLowerCase() !== "full practice track",
  );
}

export async function readSongsIndex(): Promise<Song[]> {
  if (!isBlobStorageConfigured()) {
    return [];
  }

  try {
    const blobs = await list({ prefix: SONGS_INDEX, limit: 1 });
    const indexBlob = blobs.blobs.find((b) => b.pathname === SONGS_INDEX);
    if (!indexBlob) return [];

    const res = await fetch(indexBlob.url, { cache: "no-store" });
    if (!res.ok) return [];
    return withoutLegacyDemoTrack((await res.json()) as Song[]);
  } catch {
    return [];
  }
}

export async function writeSongsIndex(songs: Song[]): Promise<void> {
  await put(SONGS_INDEX, JSON.stringify(withoutLegacyDemoTrack(songs)), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function registerUploadedSong(
  title: string,
  url: string,
): Promise<Song> {
  const song: Song = {
    id: crypto.randomUUID(),
    title: title.trim(),
    url,
    uploadedAt: new Date().toISOString(),
  };

  const songs = await readSongsIndex();
  songs.unshift(song);
  await writeSongsIndex(songs);
  return song;
}

export async function addSong(title: string, file: File): Promise<Song> {
  const id = crypto.randomUUID();
  const ext = file.name.split(".").pop() || "mp3";
  const pathname = `songs/${id}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || "audio/mpeg",
  });

  const song: Song = {
    id,
    title,
    url: blob.url,
    uploadedAt: new Date().toISOString(),
  };

  const songs = await readSongsIndex();
  songs.unshift(song);
  await writeSongsIndex(songs);
  return song;
}

export async function deleteSong(id: string): Promise<boolean> {
  const songs = await readSongsIndex();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return false;

  const [removed] = songs.splice(idx, 1);
  await writeSongsIndex(songs);

  try {
    await del(removed.url);
  } catch {
    /* blob may already be gone */
  }
  return true;
}
