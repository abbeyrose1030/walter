import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self)",
        },
      ],
    },
  ],
};

export default nextConfig;
