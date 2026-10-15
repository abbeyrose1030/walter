import { TeacherDashboard } from "@/components/TeacherDashboard";

export default async function TeacherPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  return <TeacherDashboard initialKey={key ?? ""} />;
}
