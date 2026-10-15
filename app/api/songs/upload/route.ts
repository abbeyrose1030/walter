import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { teacherPasswordFromRequest } from "@/lib/auth";
import { isBlobStorageConfigured } from "@/lib/blob-storage";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: "Storage not configured on Vercel." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!teacherPasswordFromRequest(request)) {
          throw new Error("Unauthorized");
        }

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
          tokenPayload: JSON.stringify({ title }),
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload could not start";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
