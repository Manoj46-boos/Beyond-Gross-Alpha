import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURUM Studio — Beyond Gross Alpha',
  description: 'Renders the After-Tax Returns episode as a premium midnight-ledger explainer video.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
