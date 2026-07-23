import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'SEO AI OS - Premium Multi-Tenant Audit & Optimization Engine',
  description: 'Technical SEO Crawlers, Generative Engine Optimization (GEO), and LLM Visibility dashboards.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} dark scroll-smooth`}>
      <body className="font-sans antialiased text-[#f1f5f9] bg-[#070a13] min-h-screen">
        {children}
      </body>
    </html>
  );
}
