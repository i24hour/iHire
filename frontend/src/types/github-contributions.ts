export interface ContributionDay {
    date: string;
    count: number;
}

export interface GithubContributionWeek {
    days: ContributionDay[];
}

export interface GithubContributionCalendar {
    totalContributions: number;
    weeks: GithubContributionWeek[];
}
