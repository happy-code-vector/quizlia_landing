import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Source_Serif_4 } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

// W-6.2: the display serif is ui-serif (New York) first; Source Serif 4 is the fallback for
// browsers without ui-serif. preload: false so Safari, which has New York, never downloads it.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--nf-serif',
  display: 'swap',
  adjustFontFallback: true,
  preload: false,
});

export const metadata: Metadata = {
  // Absolute URLs for canonical, Open Graph and Twitter images (standards section 11).
  metadataBase: new URL('https://quizliai.com'),
  title: 'QuizliAI - AI-Powered Note Taking & Study Assistant',
  description: 'Your smartest assistant. Get instant notes, transcripts, and study materials from anything. Never take notes again.',
  // Icons come from app/favicon.ico, app/icon.png and app/apple-icon.png
  // (Next.js file convention): every route gets them, with versioned URLs.
};

// W-8.3: the browser paints its default canvas in the OS scheme before any CSS loads.
export const viewport: Viewport = {
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={sourceSerif.variable}>
      <body>
        {/* W-8.1: next-themes is the only theme provider. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
