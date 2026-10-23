import type { Metadata } from 'next';
import { getTeamMembers } from '@/lib/data';
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
    const team = await getTeamMembers();
    return team && team.length > 0 ? team : fallbackTeam;
  } catch {
    return fallbackTeam;
  }
}

export default async function AboutPage() {
  const team = await getTeam();
  return <AboutPageClient team={team} />;
}
