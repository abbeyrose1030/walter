import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isBlobStorageConfigured } from "@/lib/blob-storage";

export type PresignedUploadContext = {
  pathname: string;
  clientPayload: string | null;
  multipart: boolean;
  request: Request;
};

type Constraints = {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
};

type Options = {
  authorize: (ctx: PresignedUploadContext) => Promise<void> | void;
  getConstraints: (ctx: PresignedUploadContext) => Constraints;
};

export function createPresignedUploadHandler(options: Options) {
  return async function POST(request: Request): Promise<NextResponse> {
    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "Storage not configured on Vercel." },
        { status: 503 },
      );
    }

    if (!process.env.BLOB_WEBHOOK_PUBLIC_KEY?.trim()) {
      return NextResponse.json(
        {
          error:
            "Blob webhook key missing. Reconnect Blob storage to walter on Vercel, then redeploy.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as HandleUploadPresignedBody;

    try {
      const jsonResponse = await handleUploadPresigned({
        body,
        request,
        getSignedToken: async (pathname, clientPayload, multipart) => {
          const ctx: PresignedUploadContext = {
            pathname,
            clientPayload,
            multipart,
            request,
          };
          await options.authorize(ctx);
          const constraints = options.getConstraints(ctx);

          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: constraints.allowedContentTypes,
            maximumSizeInBytes: constraints.maximumSizeInBytes,
            validUntil: Date.now() + 60 * 60 * 1000,
          });

          return {
            token,
            urlOptions: {
              tokenPayload: clientPayload,
            },
          };
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload could not start";
      const status =
        message === "Unauthorized" || message.includes("Unauthorized")
          ? 401
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
  };
}
