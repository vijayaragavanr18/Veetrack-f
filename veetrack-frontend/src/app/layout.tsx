import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: 'Vee Track - 3D Vertical News Reader',
  description: 'An immersive, high-contrast vertical news reading experience with physical 3D card turn animations.',
  authors: [{ name: 'Vee Track Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-background text-on-surface antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
