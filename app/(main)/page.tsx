import {
  getHomePage,
  getFeaturedPortfolio,
  getServices,
  getTestimonials,
  getSiteSettings,
} from '@/lib/data';
import HeroSection from '@/components/home/HeroSection';
import TrustedBrands from '@/components/home/TrustedBrands';
import ServicesOverview from '@/components/home/ServicesOverview';
import ProcessSection from '@/components/home/ProcessSection';
import PortfolioPreview from '@/components/home/PortfolioPreview';
import StatsSection from '@/components/home/StatsSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import AboutSection from '@/components/home/AboutSection';
import CTABanner from '@/components/home/CTABanner';

export const revalidate = 60;

async function getData() {
  try {
    const [homePage, featuredPortfolio, services, testimonials, siteSettings] =
      await Promise.all([
        getHomePage(),
        getFeaturedPortfolio(),
        getServices(),
        getTestimonials(),
        getSiteSettings(),
      ]);
    return { homePage, featuredPortfolio, services, testimonials, siteSettings };
  } catch {
    return {
      homePage: null,
      featuredPortfolio: null,
      services: null,
      testimonials: null,
      siteSettings: null,
    };
  }
}

export default async function Home() {
  const { homePage, featuredPortfolio, services, testimonials, siteSettings } = await getData();

  return (
    <>
      <HeroSection data={homePage} />
      <TrustedBrands brands={siteSettings?.clientBrands || null} />
      <ServicesOverview services={services} />
      <ProcessSection />
      <PortfolioPreview items={featuredPortfolio} />
      <StatsSection stats={homePage?.stats || null} />
      <TestimonialsSection testimonials={testimonials} />
      <AboutSection />
      <CTABanner />
    </>
  );
}
