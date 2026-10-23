// ═══════════════════════════════════════════════════════════════
// WEBRING — Unified data source (Sanity ⇄ Firestore)
// ═══════════════════════════════════════════════════════════════
// Pages import from here instead of talking to one CMS directly.
//
// Behaviour:
// - NEXT_PUBLIC_USE_FIRESTORE=true + Firebase keys present
//     → read from Firestore first; if Firestore errors or returns
//       nothing, fall back to Sanity so the page never goes blank.
// - Otherwise → Sanity only (the pre-migration behaviour).
import { client } from '@/sanity/lib/client';
import {
  siteSettingsQuery,
  homePageQuery,
  allPortfolioQuery,
  featuredPortfolioQuery,
  portfolioBySlugQuery,
  relatedPortfolioQuery,
  portfolioSlugsQuery,
  teamMembersQuery,
  servicesQuery,
  testimonialsQuery,
  allTestimonialsQuery,
  pricingQuery,
  availableDatesQuery,
} from '@/sanity/lib/queries';
import { useFirestore } from './firebase/config';
import {
  getSiteSettingsFs,
  getHomePageFs,
  getAvailableDatesFs,
  getAllPortfolioFs,
  getFeaturedPortfolioFs,
  getPortfolioBySlugFs,
  getRelatedPortfolioFs,
  getPortfolioSlugsFs,
  getTeamMembersFs,
  getServicesFs,
  getTestimonialsFs,
  getPricingFs,
} from './firebase/queries';
import type {
  SiteSettings,
  HomePage,
  PortfolioItem,
  TeamMember,
  Service,
  Testimonial,
  PricingTier,
  AvailableDates,
} from './types';

type Fetcher<T> = () => Promise<T>;

async function withFallback<T>(fsFetch: Fetcher<T>, sanityFetch: Fetcher<T>, isEmpty: (v: T) => boolean): Promise<T> {
  if (useFirestore) {
    try {
      const value = await fsFetch();
      if (!isEmpty(value)) return value;
    } catch (error) {
      console.error('[data] Firestore fetch failed, falling back to Sanity:', error);
    }
  }
  return sanityFetch();
}

const isNull = <T,>(v: T | null) => v === null || v === undefined;
const isEmptyList = <T,>(v: T[]) => !v || v.length === 0;

export function getSiteSettings(): Promise<SiteSettings | null> {
  return withFallback(
    getSiteSettingsFs,
    () => client.fetch<SiteSettings>(siteSettingsQuery).catch(() => null),
    isNull,
  );
}

export function getHomePage(): Promise<HomePage | null> {
  return withFallback(
    getHomePageFs,
    () => client.fetch<HomePage>(homePageQuery).catch(() => null),
    isNull,
  );
}

export function getAvailableDates(): Promise<AvailableDates | null> {
  return withFallback(
    getAvailableDatesFs,
    () => client.fetch<AvailableDates>(availableDatesQuery).catch(() => null),
    isNull,
  );
}

export function getAllPortfolio(): Promise<PortfolioItem[]> {
  return withFallback(
    getAllPortfolioFs,
    () => client.fetch<PortfolioItem[]>(allPortfolioQuery).catch(() => []),
    isEmptyList,
  );
}

export function getFeaturedPortfolio(): Promise<PortfolioItem[]> {
  return withFallback(
    getFeaturedPortfolioFs,
    () => client.fetch<PortfolioItem[]>(featuredPortfolioQuery).catch(() => []),
    isEmptyList,
  );
}

export function getPortfolioBySlug(slug: string): Promise<PortfolioItem | null> {
  return withFallback(
    () => getPortfolioBySlugFs(slug),
    () => client.fetch<PortfolioItem>(portfolioBySlugQuery, { slug }).catch(() => null),
    isNull,
  );
}

export function getRelatedPortfolio(category: string, slug: string): Promise<PortfolioItem[]> {
  return withFallback(
    () => getRelatedPortfolioFs(category, slug),
    () => client.fetch<PortfolioItem[]>(relatedPortfolioQuery, { category, slug }).catch(() => []),
    isEmptyList,
  );
}

export function getPortfolioSlugs(): Promise<string[]> {
  return withFallback(
    getPortfolioSlugsFs,
    () => client.fetch<string[]>(portfolioSlugsQuery).catch(() => []),
    isEmptyList,
  );
}

export function getTeamMembers(): Promise<TeamMember[]> {
  return withFallback(
    getTeamMembersFs,
    () => client.fetch<TeamMember[]>(teamMembersQuery).catch(() => []),
    isEmptyList,
  );
}

export function getServices(): Promise<Service[]> {
  return withFallback(
    getServicesFs,
    () => client.fetch<Service[]>(servicesQuery).catch(() => []),
    isEmptyList,
  );
}

export function getTestimonials(featuredOnly = true): Promise<Testimonial[]> {
  return withFallback(
    () => getTestimonialsFs(featuredOnly),
    () =>
      client
        .fetch<Testimonial[]>(featuredOnly ? testimonialsQuery : allTestimonialsQuery)
        .catch(() => []),
    isEmptyList,
  );
}

export function getPricing(): Promise<PricingTier[]> {
  return withFallback(
    getPricingFs,
    () => client.fetch<PricingTier[]>(pricingQuery).catch(() => []),
    isEmptyList,
  );
}
