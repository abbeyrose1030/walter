import type { MetadataRoute } from "next";
import { APP_NAME, STUDENT_NAME } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: `Guitar practice with video for ${STUDENT_NAME}`,
    start_url: "/",
    display: "standalone",
    background_color: "#fff9eb",
    theme_color: "#ffe566",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
