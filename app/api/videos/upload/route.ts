import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
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
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
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

        return {
          allowedContentTypes: [
            "video/webm",
            "video/mp4",
            "video/quicktime",
            "video/*",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          tokenPayload: clientPayload ?? undefined,
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload could not start";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
