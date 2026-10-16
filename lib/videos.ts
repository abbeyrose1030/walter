import { list, put } from "@vercel/blob";

export type PracticeVideo = {
  id: string;
  songId: string;
  songTitle: string;
  studentName: string;
  url: string;
  uploadedAt: string;
};

const VIDEOS_INDEX = "videos/index.json";

export async function readVideosIndex(): Promise<PracticeVideo[]> {
  try {
    const blobs = await list({ prefix: VIDEOS_INDEX, limit: 1 });
    const indexBlob = blobs.blobs.find((b) => b.pathname === VIDEOS_INDEX);
    if (!indexBlob) return [];

    const res = await fetch(indexBlob.url, { cache: "no-store" });
    if (!res.ok) return [];
    const items = (await res.json()) as PracticeVideo[];
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
  videos.unshift(entry);
  await put(VIDEOS_INDEX, JSON.stringify(videos), {
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
