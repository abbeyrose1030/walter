import { notFound } from "next/navigation";
import { PracticeSession } from "@/components/PracticeSession";
import { readSongsIndex } from "@/lib/songs";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const songs = await readSongsIndex();
  const song = songs.find((s) => s.id === id);
  if (!song) notFound();

  return (
    <PracticeSession songId={song.id} songTitle={song.title} trackUrl={song.url} />
  );
}
