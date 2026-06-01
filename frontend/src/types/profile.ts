export interface ProfileProject {
    _id?: string;
    title: string;
    description?: string;
    siteUrl?: string;
    githubUrl?: string;
    technologies: string[];
    createdAt?: string;
}

export interface PublicProfile {
    username: string;
    image?: string;
    headline?: string;
    bio?: string;
    githubUsername?: string;
    showGithubContributions?: boolean;
    githubCommitsTotal?: number;
    points?: number;
    chainPoints?: number;
    memberSince?: string;
    projects: ProfileProject[];
}

export interface ProfileUpdatePayload {
    headline?: string;
    bio?: string;
    projects?: ProfileProject[];
    showGithubContributions?: boolean;
}
