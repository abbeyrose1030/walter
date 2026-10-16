import { list, put } from "@vercel/blob";
import { isBlobStorageConfigured } from "@/lib/blob-storage";

export type PracticeVideo = {
  id: string;
  songId: string;
  songTitle: string;
  studentName: string;
  url: string;
  uploadedAt: string;
};

const VIDEOS_INDEX = "videos/index.json";

async function fetchIndexJson<T>(indexBlob: { url: string; uploadedAt?: Date }): Promise<T[]> {
  const cacheBust =
    indexBlob.uploadedAt instanceof Date
      ? indexBlob.uploadedAt.getTime()
      : Date.now();
  const res = await fetch(`${indexBlob.url}?v=${cacheBust}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as T[];
}

export async function readVideosIndex(): Promise<PracticeVideo[]> {
  if (!isBlobStorageConfigured()) {
    return [];
  }

  try {
    const { blobs } = await list({ prefix: "videos/", limit: 1000 });
    const indexBlob = blobs.find((b) => b.pathname === VIDEOS_INDEX);
    if (!indexBlob) return [];

    const items = await fetchIndexJson<PracticeVideo>(indexBlob);
    return items.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  } catch {
    return [];
  }
}

export async function appendVideo(entry: PracticeVideo): Promise<void> {
  const videos = await readVideosIndex();
  const withoutDup = videos.filter((v) => v.id !== entry.id);
  withoutDup.unshift(entry);
  await put(VIDEOS_INDEX, JSON.stringify(withoutDup), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function registerPracticeVideo(
  entry: PracticeVideo,
): Promise<PracticeVideo> {
  await appendVideo(entry);
  return entry;
}
