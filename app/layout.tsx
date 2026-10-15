import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import { WalterAppChrome } from "@/components/WalterAppChrome";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "WALTER",
  description: "Practice guitar with WALTER — play along and record for your teacher!",
  applicationName: "WALTER",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WALTER",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffe566",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${fredoka.className} antialiased`}>
        <WalterAppChrome>{children}</WalterAppChrome>
      </body>
    </html>
  );
}
