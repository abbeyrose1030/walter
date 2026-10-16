"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { APP_NAME, INSTRUCTOR_NAME, STUDENT_NAME } from "@/lib/branding";
import { readApiError } from "@/lib/read-api-error";

type Assignment = { id: string; title: string; url: string; uploadedAt: string };
type Video = {
  id: string;
  songTitle: string;
  studentName: string;
  url: string;
  uploadedAt: string;
};

type Props = { initialKey?: string };

export function TeacherDashboard({ initialKey = "" }: Props) {
  const [key, setKey] = useState(initialKey);
  const [storedKey, setStoredKey] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  const authHeaders = useCallback((): HeadersInit => {
    return storedKey ? { "x-teacher-password": storedKey } : {};
  }, [storedKey]);

  const load = useCallback(async () => {
    const [songsRes, videosRes] = await Promise.all([
      fetch("/api/songs"),
      fetch("/api/videos", { headers: authHeaders() }),
    ]);
    const songsData = (await songsRes.json()) as { songs: Assignment[] };
    setAssignments(songsData.songs);
    if (videosRes.ok) {
      const videosData = (await videosRes.json()) as { videos: Video[] };
      setVideos(videosData.videos);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("walter-teacher-key");
      if (saved) setStoredKey(saved);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, storedKey]);

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("");
    try {
      const res = await fetch("/api/teacher/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: key }),
      });
      if (res.status === 401) {
        setStatus("Wrong password — try again.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus(data.error || "Could not sign in. Refresh and try again.");
        return;
      }
      sessionStorage.setItem("walter-teacher-key", key);
      setStoredKey(key);
    } catch {
      setStatus("Could not check password. Try again.");
    }
  };

  const signOut = () => {
    sessionStorage.removeItem("walter-teacher-key");
    setStoredKey("");
    setVideos([]);
    setKey("");
  };

  const uploadReference = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storedKey) {
      setStatus(`Enter your ${INSTRUCTOR_NAME} password first.`);
      return;
    }
    setUploading(true);
    setStatus("Uploading…");
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const file = form.get("file");

    if (!title || !(file instanceof File)) {
      setStatus("Add a riff name and pick a reference video.");
      setUploading(false);
      return;
    }

    const id = crypto.randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const pathname = `songs/${id}.${ext}`;

    try {
      const blob = await uploadPresigned(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/songs/upload",
        headers: authHeaders() as Record<string, string>,
        clientPayload: JSON.stringify({ title }),
        multipart: file.size > 4 * 1024 * 1024,
        contentType: file.type || "video/mp4",
      });

      const res = await fetch("/api/songs/register", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, url: blob.url }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not save assignment"));
      }

      e.currentTarget.reset();
      setStatus(`Reference video added for ${STUDENT_NAME}!`);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAssignment = async (id: string) => {
    if (!storedKey) return;
    if (!confirm("Remove this riff and its reference video?")) return;
    const res = await fetch(`/api/songs?id=${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) await load();
  };

  const teacherUnlocked = Boolean(storedKey);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 text-center">
        <p className="text-3xl font-bold text-[var(--walter-grape)]">{INSTRUCTOR_NAME}</p>
        <p className="mt-1 text-sm opacity-80">
          Upload reference riffs & watch {STUDENT_NAME}&apos;s practice videos.
        </p>
      </div>

      {!teacherUnlocked ? (
        <form
          onSubmit={(e) => void unlock(e)}
          className="mb-8 rounded-2xl bg-white p-5 shadow-sm"
        >
          <label className="mb-2 block text-sm font-semibold">{INSTRUCTOR_NAME} password</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mb-3 w-full rounded-xl border-2 border-[var(--walter-sun)] px-3 py-2"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="rounded-xl bg-[var(--walter-grape)] px-4 py-2 font-semibold text-white"
          >
            Unlock
          </button>
        </form>
      ) : (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={signOut}
            className="text-sm font-semibold text-[var(--walter-coral)]"
          >
            Lock {INSTRUCTOR_NAME} tab
          </button>
        </div>
      )}

      {teacherUnlocked && (
        <form
          onSubmit={(e) => void uploadReference(e)}
          className="mb-8 rounded-2xl bg-white p-5 shadow-sm"
        >
          <h2 className="mb-1 font-bold">Reference video</h2>
          <p className="mb-3 text-xs opacity-70">
            Record yourself playing the riff — {STUDENT_NAME} will watch this before
            she records.
          </p>
          <input
            name="title"
            required
            placeholder="Riff name (e.g. Smoke on the Water intro)"
            className="mb-2 w-full rounded-xl border px-3 py-2"
          />
          <input
            name="file"
            type="file"
            accept="video/*"
            required
            className="mb-3 w-full text-sm"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-[var(--walter-sky)] px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload reference video"}
          </button>
        </form>
      )}

      {status && (
        <p className="mb-4 rounded-xl bg-[var(--walter-sun)]/40 px-4 py-2 text-sm">{status}</p>
      )}

      <section className="mb-8">
        <h2 className="mb-2 font-bold">Riffs ({assignments.length})</h2>
        {assignments.length === 0 ? (
          <p className="text-sm opacity-70">No reference videos yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {assignments.map((a) => (
              <li key={a.id} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{a.title}</span>
                  {teacherUnlocked && (
                    <button
                      type="button"
                      onClick={() => void removeAssignment(a.id)}
                      className="shrink-0 text-xs font-semibold text-[var(--walter-coral)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <video
                  src={a.url}
                  controls
                  playsInline
                  className="w-full rounded-xl bg-black"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {teacherUnlocked && (
        <section>
          <h2 className="mb-2 font-bold">{STUDENT_NAME}&apos;s practice videos ({videos.length})</h2>
          {videos.length === 0 ? (
            <p className="text-sm opacity-70">
              No videos yet — tell {STUDENT_NAME} to open {APP_NAME}!
            </p>
          ) : (
            <ul className="flex flex-col gap-6">
              {videos.map((v) => (
                <li key={v.id} className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="mb-2 text-sm font-semibold">
                    {v.songTitle} · {new Date(v.uploadedAt).toLocaleString()}
                  </p>
                  <video
                    src={v.url}
                    controls
                    playsInline
                    className="w-full rounded-xl bg-black"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
