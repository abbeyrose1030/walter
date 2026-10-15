import { createPresignedUploadHandler } from "@/lib/blob-presigned-upload";

export const runtime = "nodejs";

export const POST = createPresignedUploadHandler({
  authorize({ clientPayload }) {
    let songId = "";
    try {
      const parsed = JSON.parse(clientPayload ?? "{}") as { songId?: string };
      songId = parsed.songId ?? "";
    } catch {
      /* ignore */
    }
    if (!songId) {
      throw new Error("Missing song for this recording");
    }
  },
  getConstraints: () => ({
    allowedContentTypes: [
      "video/webm",
      "video/mp4",
      "video/quicktime",
      "video/*",
    ],
    maximumSizeInBytes: 500 * 1024 * 1024,
  }),
});
