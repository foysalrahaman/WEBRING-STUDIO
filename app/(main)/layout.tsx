import type { Metadata, Viewport } from 'next';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import '../globals.css';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Toaster } from 'sonner';
import { client } from '@/sanity/lib/client';
import { siteSettingsQuery } from '@/sanity/lib/queries';
import type { SiteSettings } from '@/lib/types';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'WEBRING — AI Product Photography & Brand Visual Studio',
    template: '%s | WEBRING',
  },
  description: "We Don't Just Edit. We Engineer Reality. AI-powered product photography and brand visuals for e-commerce brands worldwide. Based in Bangladesh.",
  keywords: ['AI product photography', 'e-commerce photography', 'brand identity', 'AI visuals', 'product branding', 'WEBRING'],
  authors: [{ name: 'WEBRING' }],
  creator: 'WEBRING',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://webring.studio'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'WEBRING',
    title: 'WEBRING — AI Product Photography & Brand Visual Studio',
    description: "We Don't Just Edit. We Engineer Reality. AI-powered product photography and brand visuals.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WEBRING — AI Product Photography & Brand Visual Studio',
    description: "We Don't Just Edit. We Engineer Reality.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'dER_Z5caB90aSE9uSDM8nGESR_gNsSFBJpNS-MIs90E',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    // Reduced revalidate to 10 seconds so the maintenance toggle is fast and responsive
    return await client.fetch(siteSettingsQuery, {}, { next: { revalidate: 10 } });
  } catch {
    return null;
  }
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteSettings = await getSiteSettings();

  // If Maintenance Mode is toggled ON in Sanity CMS
  if (siteSettings?.maintenanceMode) {
    return (
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-body antialiased min-h-screen bg-[#050505] flex items-center justify-center text-center p-6`}>
          <div className="max-w-md w-full border border-[#C8A96E]/20 p-10 rounded-2xl bg-white/[0.02] backdrop-blur-md">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-16 h-16 text-[#C8A96E] mx-auto mb-8 animate-spin" style={{ animationDuration: '20s' }}>
              <mask id="aperture-mask-m">
                <rect width="100" height="100" fill="white" />
                <rect x="46" y="0" width="8" height="100" fill="black" />
                <rect x="0" y="46" width="100" height="8" fill="black" />
                <circle cx="50" cy="50" r="24" fill="black" />
              </mask>
              <circle cx="50" cy="50" r="48" mask="url(#aperture-mask-m)" />
              <circle cx="50" cy="50" r="16" opacity="0.5" />
            </svg>
            <h1 className="font-display font-black text-4xl uppercase text-white tracking-widest mb-4">
              {siteSettings.companyName || 'WEBRING'}
            </h1>
            <p className="text-[#C8A96E] text-md font-light tracking-wide leading-relaxed">
              We are currently upgrading our studio experience.<br />We&apos;ll be back online soon.
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <div className={`${inter.variable} font-body antialiased`}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer siteSettings={siteSettings} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            },
          }}
        />
        <GoogleAnalytics gaId="G-9CVNBDEQG6" />
        <Analytics />
        <SpeedInsights />
      </ThemeProvider>
    </div>
  );
}
