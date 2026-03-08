import { redirect } from 'next/navigation';

export default async function Home() {
  // Directly forward the user to their iTime workspace
  redirect('/itime');
}
