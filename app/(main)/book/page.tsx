import type { Metadata } from 'next';
import { client } from '@/sanity/lib/client';
import { servicesQuery, availableDatesQuery, teamMembersQuery } from '@/sanity/lib/queries';
import type { Service, AvailableDates, TeamMember } from '@/lib/types';
import BookPageClient from './BookPageClient';

export const metadata: Metadata = {
  title: 'Book a Free Strategy Call',
  description: 'Schedule a free consultation with the WEBRING team. We will discuss your brand, product photography needs, and create a custom visual strategy.',
};

export const revalidate = 60;

async function getData() {
  try {
    const [services, availableDates, team] = await Promise.all([
      client.fetch<Service[]>(servicesQuery),
      client.fetch<AvailableDates>(availableDatesQuery),
      client.fetch<TeamMember[]>(teamMembersQuery),
    ]);
    return { services, availableDates, team };
  } catch {
    return { services: null, availableDates: null, team: null };
  }
}

export default async function BookPage() {
  const { services, availableDates, team } = await getData();
  return <BookPageClient services={services} availableDates={availableDates} team={team} />;
}
