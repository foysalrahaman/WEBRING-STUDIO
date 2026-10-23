import type { Metadata } from 'next';
import { client } from '@/sanity/lib/client';
import { siteSettingsQuery } from '@/sanity/lib/queries';
import type { SiteSettings } from '@/lib/types';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with WEBRING. We respond within 24 hours. Email us at hello@webring.studio or fill out our contact form.',
};

export const revalidate = 60;

async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    return await client.fetch<SiteSettings>(siteSettingsQuery);
  } catch {
    return null;
  }
}

export default async function ContactPage() {
  const siteSettings = await getSiteSettings();
  return <ContactPageClient siteSettings={siteSettings} />;
}
