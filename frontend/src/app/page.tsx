import { HomeShowcase } from '@/components/profile/HomeShowcase';

export async function generateMetadata() {
    return {
        title: 'Builder Profiles',
        description: 'Discover builder profiles, projects, site links, and GitHub repos on Infinwork.',
        alternates: {
            canonical: '/',
        },
    };
}

export default function Home() {
    return <HomeShowcase />;
}
