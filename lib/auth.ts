import { NextRequest } from "next/server";

/** Override anytime with TEACHER_PASSWORD in Vercel env. */
export const DEFAULT_TEACHER_PASSWORD = "relientk1030";

export function getTeacherPassword(): string {
  return process.env.TEACHER_PASSWORD?.trim() || DEFAULT_TEACHER_PASSWORD;
}

export function isTeacherAuthorized(request: NextRequest): boolean {
  const secret = getTeacherPassword();

  const header = request.headers.get("x-teacher-password");
  if (header === secret) return true;

  const url = new URL(request.url);
  const query = url.searchParams.get("key");
  return query === secret;
}
