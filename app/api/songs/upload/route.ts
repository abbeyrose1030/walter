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
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/*",
      ],
      maximumSizeInBytes: 500 * 1024 * 1024,
    };
  },
});
