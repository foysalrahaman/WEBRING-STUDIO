// ═══════════════════════════════════════
// WEBRING — Type Definitions
// ═══════════════════════════════════════

export interface SiteSettings {
  companyName: string;
  maintenanceMode?: boolean;
  tagline: string;
  email: string;
  whatsapp?: string;
  location: string;
  logo?: SanityImage;
  logoDark?: SanityImage;
  ogImage?: SanityImage;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  behanceUrl?: string;
  clientBrands?: ClientBrand[];
}

export interface ClientBrand {
  _key: string;
  name: string;
  logo: SanityImage;
}

export interface HomePage {
  heroLine1: string;
  heroLine2: string;
  heroSubtitle: string;
  socialProof: string;
  cta1Text: string;
  cta2Text: string;
  heroMainImage?: SanityImage;
  heroImages?: SanityImage[];
  marqueeText: string;
  stats?: StatItem[];
  ctaBannerHeading: string;
  ctaBannerSubtext: string;
}

export interface StatItem {
  _key: string;
  value: number;
  label: string;
  suffix: string;
}

export interface PortfolioItem {
  _id: string;
  title: string;
  slug: { current: string };
  category: 'AI Photography' | 'Lifestyle' | 'E-commerce' | 'Branding' | 'Video';
  clientIndustry?: string;
  projectDate?: string;
  featured: boolean;
  order: number;
  coverImage: SanityImage;
  projectImages?: Array<{
    image: SanityImage;
    caption?: string;
    isBeforeImage?: boolean;
    isAfterImage?: boolean;
  }>;
  shortDescription?: string;
  fullDescription?: string;
  tools?: string[];
  tags?: string[];
  results?: Array<{
    metric: string;
    value: string;
    description: string;
  }>;
  fallbackUrl?: string;
}

export interface TeamMember {
  _id: string;
  name: string;
  role: string;
  responsibilities: string[];
  bio?: string;
  photo?: SanityImage;
  instagramUrl?: string;
  linkedinUrl?: string;
  fallbackUrl?: string;
  order: number;
}

export interface Service {
  _id: string;
  title: string;
  slug: { current: string };
  subtitle: string;
  description: string;
  features: string[];
  image?: SanityImage;
  fallbackUrl?: string;
  icon: string;
  startingPrice?: string;
  order: number;
}

export interface Testimonial {
  _id: string;
  clientName: string;
  company: string;
  quote: string;
  rating: number;
  avatar?: SanityImage;
  service: string;
  featured: boolean;
}

export interface PricingTier {
  _id: string;
  tierName: string;
  price: number;
  period: string;
  highlighted: boolean;
  features: string[];
  ctaText: string;
  order: number;
}

export interface Booking {
  _id?: string;
  clientName: string;
  email: string;
  whatsapp?: string;
  company?: string;
  services: string[];
  productCategory: string;
  budget: string;
  notes?: string;
  selectedDate: string;
  selectedTime: string;
  referral?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt?: string;
}

export interface AvailableDates {
  dates: string[];
  timeSlots: string[];
}

export interface SanityImage {
  _type: 'image';
  asset: {
    _ref: string;
    _type: 'reference';
  };
  alt?: string;
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  service: string;
  message: string;
}
