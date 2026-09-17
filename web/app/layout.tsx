import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Wandr AI Console",
  description: "Agent workflow console for LangGraph travel and research runs."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
