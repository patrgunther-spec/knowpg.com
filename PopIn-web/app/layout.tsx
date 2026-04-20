import './globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/lib/app';

export const metadata: Metadata = {
  title: 'Pop In',
  description: 'pop in on your friends',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pop In',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
