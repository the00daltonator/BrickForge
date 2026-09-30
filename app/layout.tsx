import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrickForge — Ideas into bricks",
  description: "Create brick sculptures from ideas, photos, and 3D models. Match your inventory and export LDraw files, parts lists, and instructions.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
