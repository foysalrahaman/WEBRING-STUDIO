import type { Metadata } from 'next';
import { client } from '@/sanity/lib/client';
import { teamMembersQuery } from '@/sanity/lib/queries';
import type { TeamMember } from '@/lib/types';
import AboutPageClient from './AboutPageClient';

export const metadata: Metadata = {
  title: 'About Us — The Minds Behind WEBRING',
  description: 'Meet the creative team behind WEBRING. We are a Bangladesh-based AI-powered product photography and brand visual studio serving clients worldwide.',
};

export const revalidate = 60;

import { fallbackTeam } from '@/lib/fallbackData';

async function getTeam(): Promise<TeamMember[]> {
  try {
    const team = await client.fetch<TeamMember[]>(teamMembersQuery);
    return team && team.length > 0 ? team : fallbackTeam;
  } catch {
    return fallbackTeam;
  }
}

export default async function AboutPage() {
  const team = await getTeam();
  return <AboutPageClient team={team} />;
}
