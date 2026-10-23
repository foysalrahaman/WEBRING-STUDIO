import type { Metadata } from 'next';
import { client } from '@/sanity/lib/client';
import { servicesQuery } from '@/sanity/lib/queries';
import type { Service } from '@/lib/types';
import ServicesPageClient from './ServicesPageClient';

export const metadata: Metadata = {
  title: 'Our Services — AI Photography, Branding & E-commerce Visuals',
  description: 'From AI product photography to complete brand identity packages. Explore the five core services WEBRING offers to transform your e-commerce visuals.',
};

export const revalidate = 60;

const fallbackServices: Service[] = [
  {
    _id: '1',
    title: 'AI Product Photography',
    slug: { current: 'ai-product-photography' },
    subtitle: 'Studio-quality shots, powered by AI',
    description: 'We use cutting-edge AI tools combined with professional editing to create product photos that look like they were shot in a $10,000/day studio. Perfect white backgrounds, dramatic lighting, lifestyle contexts — all generated with pixel-perfect precision.',
    features: ['Unlimited backgrounds', 'Multiple angles', 'Shadow & reflection control', 'White background removal', 'Batch processing'],
    icon: 'Camera',
    fallbackUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop',
    startingPrice: '$49',
    order: 0,
  },
  {
    _id: '2',
    title: 'Lifestyle Photography (AI)',
    slug: { current: 'lifestyle-photography' },
    subtitle: 'Contextual scenes that tell your brand story',
    description: 'Place your products in beautiful, realistic lifestyle scenes without the cost of a real photoshoot. Kitchen counters, bedroom settings, outdoor adventures — we create the context that makes your product feel aspirational.',
    features: ['Custom scene creation', 'Model integration', 'Seasonal themes', 'Social media optimized', 'A/B testing variants'],
    icon: 'Image',
    fallbackUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1200&auto=format&fit=crop',
    startingPrice: '$79',
    order: 1,
  },
  {
    _id: '3',
    title: 'E-commerce Visual Package',
    slug: { current: 'ecommerce-visual-package' },
    subtitle: 'Complete visual solution for your store',
    description: 'Everything you need to launch or refresh your online store. From hero banners to product detail images, we deliver a complete visual package optimized for conversion across Amazon, Shopify, and every major platform.',
    features: ['Platform-optimized sizes', 'Infographic overlays', 'Comparison charts', 'Banner designs', 'Gallery sequences'],
    icon: 'ShoppingBag',
    fallbackUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
    startingPrice: '$199',
    order: 2,
  },
  {
    _id: '4',
    title: 'AI Image & Video Content',
    slug: { current: 'ai-image-video' },
    subtitle: 'Dynamic content for ads and social',
    description: 'Scroll-stopping visual content for Instagram, TikTok, Facebook ads, and more. We create AI-powered images and short videos that capture attention and drive engagement, tailored to each platform\'s specifications.',
    features: ['Social media content', 'Ad creative variants', 'Motion graphics', 'Short-form video', 'Story/Reel formats'],
    icon: 'Video',
    fallbackUrl: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=1200&auto=format&fit=crop',
    startingPrice: '$99',
    order: 3,
  },
  {
    _id: '5',
    title: 'Brand Identity & Branding',
    slug: { current: 'brand-identity' },
    subtitle: 'From logo to full visual language',
    description: 'Build a brand that\'s impossible to ignore. We craft complete visual identities — logo, color palette, typography, brand guidelines, social templates — that communicate your brand\'s essence at every touchpoint.',
    features: ['Logo design', 'Brand guidelines', 'Color & typography system', 'Social media templates', 'Packaging design'],
    icon: 'Sparkles',
    fallbackUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
    startingPrice: '$299',
    order: 4,
  },
];

async function getServices(): Promise<Service[]> {
  try {
    const services = await client.fetch<Service[]>(servicesQuery);
    return services && services.length > 0 ? services : fallbackServices;
  } catch {
    return fallbackServices;
  }
}

export default async function ServicesPage() {
  const services = await getServices();
  return <ServicesPageClient services={services} />;
}
