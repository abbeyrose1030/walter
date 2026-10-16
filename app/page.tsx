import Link from "next/link";
import { APP_NAME, INSTRUCTOR_NAME, STUDENT_NAME } from "@/lib/branding";
import { readSongsIndex } from "@/lib/songs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const songs = await readSongsIndex();

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="mb-8 text-center">
        <p className="walter-bounce text-5xl font-bold tracking-tight text-[var(--walter-coral)]">
          {APP_NAME}
        </p>
        <p className="mt-2 text-lg font-medium">
          Hey {STUDENT_NAME}! 👋 Pick a song to practice.
        </p>
      </div>

      {songs.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-[var(--walter-sky)] bg-white p-8 text-center">
          <p className="text-lg font-semibold">No songs yet</p>
          <p className="mt-2 text-sm opacity-80">
            {INSTRUCTOR_NAME} will add practice tracks here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/practice/${song.id}`}
                className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-lg font-semibold shadow-sm ring-2 ring-transparent transition active:ring-[var(--walter-sun)]"
              >
                <span>{song.title}</span>
                <span aria-hidden>🎵</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-xs opacity-50">
        Add {APP_NAME} to your Home Screen from Safari&apos;s Share menu.
      </p>
    </main>
  );
}
