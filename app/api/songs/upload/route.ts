import { teacherPasswordFromRequest } from "@/lib/auth";
import { createPresignedUploadHandler } from "@/lib/blob-presigned-upload";

export const runtime = "nodejs";

export const POST = createPresignedUploadHandler({
  authorize({ request }) {
    if (!teacherPasswordFromRequest(request)) {
      throw new Error("Unauthorized");
    }
  },
  getConstraints({ clientPayload }) {
    let title = "";
    try {
      const parsed = JSON.parse(clientPayload ?? "{}") as { title?: string };
      title = parsed.title?.trim() ?? "";
    } catch {
      /* ignore */
    }
    if (!title) {
      throw new Error("Song title required");
    }
    return {
      allowedContentTypes: [
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/wav",
        "audio/*",
      ],
      maximumSizeInBytes: 200 * 1024 * 1024,
    };
  },
});
