import type { Metadata } from 'next';
import { getAllPortfolio } from '@/lib/data';
import type { PortfolioItem } from '@/lib/types';
import PortfolioPageClient from './PortfolioPageClient';

export const metadata: Metadata = {
  title: 'Our Work — AI Product Photography Portfolio',
  description: 'Browse our portfolio of AI-powered product photography, lifestyle shoots, e-commerce visuals, and branding projects for clients worldwide.',
};

export const revalidate = 60;

async function getPortfolio(): Promise<PortfolioItem[]> {
  try {
    const items = await getAllPortfolio();
    return items || [];
  } catch {
    return [];
  }
}

export default async function PortfolioPage() {
  const items = await getPortfolio();
  return <PortfolioPageClient items={items} />;
}
