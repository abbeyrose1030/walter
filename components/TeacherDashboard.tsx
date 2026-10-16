"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { APP_NAME, INSTRUCTOR_NAME, STUDENT_NAME } from "@/lib/branding";
import { readApiError } from "@/lib/read-api-error";

type Song = { id: string; title: string; uploadedAt: string };
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
  const [songs, setSongs] = useState<Song[]>([]);
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
    const songsData = (await songsRes.json()) as { songs: Song[] };
    setSongs(songsData.songs);
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

  const uploadSong = async (e: FormEvent<HTMLFormElement>) => {
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
      setStatus("Add a song name and pick an audio file.");
      setUploading(false);
      return;
    }

    const id = crypto.randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const pathname = `songs/${id}.${ext}`;

    try {
      const blob = await uploadPresigned(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/songs/upload",
        headers: authHeaders() as Record<string, string>,
        clientPayload: JSON.stringify({ title }),
        multipart: file.size > 4 * 1024 * 1024,
        contentType: file.type || "audio/mpeg",
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
        throw new Error(await readApiError(res, "Could not save song"));
      }

      e.currentTarget.reset();
      setStatus(`Song added for ${STUDENT_NAME}!`);
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeSong = async (id: string) => {
    if (!storedKey) return;
    if (!confirm("Remove this song?")) return;
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
          Upload songs & watch {STUDENT_NAME}&apos;s videos.
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
        <form onSubmit={uploadSong} className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold">Add a practice song</h2>
          <input
            name="title"
            required
            placeholder="Song name"
            className="mb-2 w-full rounded-xl border px-3 py-2"
          />
          <input
            name="file"
            type="file"
            accept="audio/*"
            required
            className="mb-3 w-full text-sm"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-[var(--walter-sky)] px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {uploading ? "Uploading…" : `Upload for ${STUDENT_NAME}`}
          </button>
        </form>
      )}

      {status && (
        <p className="mb-4 rounded-xl bg-[var(--walter-sun)]/40 px-4 py-2 text-sm">{status}</p>
      )}

      <section className="mb-8">
        <h2 className="mb-2 font-bold">Songs ({songs.length})</h2>
        <ul className="flex flex-col gap-2">
          {songs.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm"
            >
              <span>{s.title}</span>
              {teacherUnlocked && (
                <button
                  type="button"
                  onClick={() => void removeSong(s.id)}
                  className="text-[var(--walter-coral)]"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {teacherUnlocked && (
        <section>
          <h2 className="mb-2 font-bold">Practice videos ({videos.length})</h2>
          {videos.length === 0 ? (
            <p className="text-sm opacity-70">
              No videos yet — tell {STUDENT_NAME} to hit {APP_NAME}!
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
