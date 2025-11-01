import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lexvor Invoice System",
  description: "Modern invoice system with database, currency, and PDF export",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
