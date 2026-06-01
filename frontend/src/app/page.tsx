import { permanentRedirect } from 'next/navigation';

export async function generateMetadata() {
    return {
        title: 'AI Workspace That Measures Your Work',
        description: 'Set targets, build chains, track time, and analyze productivity using human performance charts.',
        alternates: {
            canonical: '/workers',
        },
    };
}

export default function Home() {
    permanentRedirect('/workers');
}
