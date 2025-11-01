import "./globals.css";
import type { Metadata } from "next";

console.log("🧠 Rendering RootLayout...");

export const metadata: Metadata = {
  title: "Invoice System | Lexvor Group",
  description: "Cloud-based invoice system built with Next.js + TailwindCSS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.log("📄 RootLayout mounted");
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
