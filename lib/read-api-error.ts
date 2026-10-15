export async function readApiError(
  res: Response,
  fallback: string,
): Promise<string> {
  if (res.status === 413) {
    return "That file is too large for a direct upload. Try a shorter MP3 or contact support.";
  }

  const text = await res.text();
  if (!text.trim()) {
    if (res.status === 401)
      return "Wrong password — lock and unlock again.";
    if (res.status >= 500) return "Server error — wait a moment and try again.";
    return fallback;
  }

  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}
