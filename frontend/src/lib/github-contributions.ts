import type { GithubContributionCalendar, ContributionDay, GithubContributionWeek } from '@/types/github-contributions';

const CALENDAR_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export async function fetchGithubContributionCalendar(
    username: string
): Promise<GithubContributionCalendar | null> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const res = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: CALENDAR_QUERY,
                variables: { login: username },
            }),
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            console.error('GitHub calendar fetch failed:', res.status);
            return null;
        }

        const json = await res.json();
        if (json.errors?.length) {
            console.error('GitHub calendar GraphQL errors:', json.errors);
            return null;
        }

        const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
        if (!calendar) return null;

        const weeks: GithubContributionWeek[] = (Array.isArray(calendar.weeks) ? calendar.weeks : [])
            .map((week: { contributionDays?: Array<{ date?: string; contributionCount?: number }> }) => ({
                days: (Array.isArray(week?.contributionDays) ? week.contributionDays : [])
                    .filter((day) => day?.date)
                    .map((day) => ({
                        date: day.date as string,
                        count: Math.max(0, Number(day.contributionCount || 0)),
                    })),
            }));

        return {
            totalContributions: Math.max(0, Number(calendar.totalContributions || 0)),
            weeks,
        };
    } catch (error) {
        console.error('Error fetching GitHub contribution calendar:', error);
        return null;
    }
}

export function getContributionLevel(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
}

export function flattenCalendarDays(weeks: GithubContributionWeek[]): ContributionDay[] {
    return weeks.flatMap((week) => week.days);
}
