// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice System',
  description: 'Invoice builder with PDF export',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.log('Rendering RootLayout');
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
