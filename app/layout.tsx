import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice System',
  description: 'Cloud-based invoice system built with Next.js and Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
