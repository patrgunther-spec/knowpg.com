import './globals.css';

export const metadata = {
  title: 'Golf Swing Coach',
  description:
    'AI golf swing analyzer. Upload a swing, get 3-5 actionable fixes to lower your handicap.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#06100A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
