import { permanentRedirect } from 'next/navigation';

export const metadata = {
    alternates: {
        canonical: '/workers',
    },
};

export default function Home() {
    permanentRedirect('/workers');
}
