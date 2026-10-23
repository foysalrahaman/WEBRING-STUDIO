import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { urlFor } from '@/sanity/lib/image';
import { getPortfolioBySlug, getPortfolioSlugs } from '@/lib/data';
import type { PortfolioItem } from '@/lib/types';
import PortfolioDetailClient from './PortfolioDetailClient';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const slugs = await getPortfolioSlugs();
    return (slugs || []).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const item = await getPortfolioBySlug(params.slug);
    if (!item) return { title: 'Project Not Found' };
    return {
      title: `${item.title} | WEBRING Portfolio`,
      description: item.shortDescription || `${item.title} — ${item.category} project by WEBRING`,
      openGraph: {
        images: item.coverImage ? [urlFor(item.coverImage).width(1200).height(630).url()] : [],
      }
    };
  } catch {
    return { title: 'Portfolio | WEBRING' };
  }
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  let project: PortfolioItem | null = null;

  try {
    project = await getPortfolioBySlug(params.slug);
  } catch {
    // graceful fallback
  }

  if (!project) notFound();

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20">
      <PortfolioDetailClient project={project} />
    </div>
  );
}
