import './globals.css';

export const metadata = {
  title: 'Golf Swing Coach',
  description:
    'AI golf swing analyzer. Upload a swing, get 5-10 actionable fixes to lower your handicap.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#06100A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
