import { list, put, del } from "@vercel/blob";
import { isBlobStorageConfigured } from "@/lib/blob-storage";

export type Song = {
  id: string;
  title: string;
  url: string;
  uploadedAt: string;
};

const SONGS_INDEX = "songs/index.json";

/** Shipped with the app so Ava can practice before Blob uploads are set up. */
export const BUNDLED_SONGS: Song[] = [
  {
    id: "full-practice-track",
    title: "Full Practice Track",
    url: "/tracks/full-practice-track.mp3",
    uploadedAt: "2026-10-15T00:00:00.000Z",
  },
];

function mergeBundledSongs(fromBlob: Song[]): Song[] {
  const ids = new Set(fromBlob.map((s) => s.id));
  const bundled = BUNDLED_SONGS.filter((s) => !ids.has(s.id));
  return [...fromBlob, ...bundled];
}

export async function readSongsIndex(): Promise<Song[]> {
  if (!isBlobStorageConfigured()) {
    return [...BUNDLED_SONGS];
  }

  try {
    const blobs = await list({ prefix: SONGS_INDEX, limit: 1 });
    const indexBlob = blobs.blobs.find((b) => b.pathname === SONGS_INDEX);
    if (!indexBlob) return mergeBundledSongs([]);

    const res = await fetch(indexBlob.url, { cache: "no-store" });
    if (!res.ok) return mergeBundledSongs([]);
    return mergeBundledSongs((await res.json()) as Song[]);
  } catch {
    return mergeBundledSongs([]);
  }
}

export async function writeSongsIndex(songs: Song[]): Promise<void> {
  await put(SONGS_INDEX, JSON.stringify(songs), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
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

  const songs = (await readSongsIndex()).filter(
    (s) => !BUNDLED_SONGS.some((b) => b.id === s.id),
  );
  songs.unshift(song);
  await writeSongsIndex(songs);
  return song;
}

export async function deleteSong(id: string): Promise<boolean> {
  if (BUNDLED_SONGS.some((s) => s.id === id)) return false;

  const songs = (await readSongsIndex()).filter(
    (s) => !BUNDLED_SONGS.some((b) => b.id === s.id),
  );
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
