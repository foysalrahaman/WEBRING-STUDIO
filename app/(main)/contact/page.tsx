import type { Metadata } from 'next';
import { getSiteSettings as fetchSiteSettings } from '@/lib/data';
import type { SiteSettings } from '@/lib/types';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with WEBRING. We respond within 24 hours. Email us at hello@webring.studio or fill out our contact form.',
};

export const revalidate = 60;

async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    return await fetchSiteSettings();
  } catch {
    return null;
  }
}

export default async function ContactPage() {
  const siteSettings = await getSiteSettings();
  return <ContactPageClient siteSettings={siteSettings} />;
}
