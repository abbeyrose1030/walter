"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { INSTRUCTOR_NAME } from "@/lib/branding";

const TAB_BAR_HEIGHT = "4.25rem";

export function WalterAppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const inPractice = pathname.startsWith("/practice");

  if (inPractice) {
    return <>{children}</>;
  }

  const practiceActive = pathname === "/";
  const teacherActive = pathname.startsWith("/teacher");

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ paddingBottom: TAB_BAR_HEIGHT }}
    >
      <div className="flex-1">{children}</div>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[var(--walter-sun)] bg-white/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-1 p-2">
          <Link
            href="/"
            className={`rounded-xl py-3 text-center text-sm font-bold transition ${
              practiceActive
                ? "bg-[var(--walter-sun)] text-[var(--walter-ink)]"
                : "text-[var(--walter-ink)] opacity-70"
            }`}
            aria-current={practiceActive ? "page" : undefined}
          >
            🎸 Practice
          </Link>
          <Link
            href="/teacher"
            className={`rounded-xl py-3 text-center text-sm font-bold transition ${
              teacherActive
                ? "bg-[var(--walter-grape)] text-white"
                : "text-[var(--walter-ink)] opacity-70"
            }`}
            aria-current={teacherActive ? "page" : undefined}
          >
            🔒 {INSTRUCTOR_NAME}
          </Link>
        </div>
      </nav>
    </div>
  );
}
