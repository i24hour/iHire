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
    points?: number;
    projects: ProfileProject[];
}

export interface ProfileUpdatePayload {
    headline?: string;
    bio?: string;
    projects?: ProfileProject[];
}
