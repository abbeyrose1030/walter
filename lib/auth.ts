import { NextRequest } from "next/server";

export function isTeacherAuthorized(request: NextRequest): boolean {
  const secret = process.env.TEACHER_PASSWORD;
  if (!secret) return false;

  const header = request.headers.get("x-teacher-password");
  if (header === secret) return true;

  const url = new URL(request.url);
  const query = url.searchParams.get("key");
  return query === secret;
}
