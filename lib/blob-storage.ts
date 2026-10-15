/** Vercel Blob: read-write token and/or OIDC (BLOB_STORE_ID on deploy). */
export function isBlobStorageConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  if (process.env.BLOB_STORE_ID?.trim()) return true;
  return false;
}

export function blobNotConfiguredMessage(): string {
  return "Storage not configured. In Vercel: Storage → Blob → connect to this project, then Redeploy.";
}
