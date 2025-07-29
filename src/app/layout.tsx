import type { Metadata } from 'next';
import { Inter, Merriweather, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppLayout } from '@/components/app-layout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '700'],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'KashFlow',
  description: 'Streamlined cash collection and reconciliation for cleaners.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${merriweather.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        <AppLayout>{children}</AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
