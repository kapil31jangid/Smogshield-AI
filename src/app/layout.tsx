import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmogShield AI — Winter Smog & Family Air Protection Assistant',
  description:
    'Context-aware Indian NAQI air intelligence, personalized daily household action plans, indoor air protection, low-emission lifestyle planner, and bilingual GenAI family assistant.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-700 selection:text-white">
        <a
          href="#main-workspace"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-800 focus:px-4 focus:py-3 focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
