import './globals.css';
import type { Metadata } from 'next';
import { Rethink_Sans, Source_Serif_4 } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

// Fonts load through next/font only (self-hosted, size-adjusted fallback, no layout jump).
const rethink = Rethink_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--nf-rethink',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--nf-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'QuizliAI - AI-Powered Note Taking & Study Assistant',
  description: 'Your smartest assistant. Get instant notes, transcripts, and study materials from anything. Never take notes again.',
  // Icons come from app/favicon.ico, app/icon.png and app/apple-icon.png
  // (Next.js file convention): every route gets them, with versioned URLs.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${rethink.variable} ${sourceSerif.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols is still used by the /note app (icon font). */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body className="font-rethink-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}