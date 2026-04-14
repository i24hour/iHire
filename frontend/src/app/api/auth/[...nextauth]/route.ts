import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from '@/lib/mongodb';
import { ensureUserHasDefaultUsername } from '@/lib/username';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            authorization: {
                params: {
                    scope: 'read:user user:email'
                }
            }
        }),
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "you@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // For demo purposes - in production, verify against your database
                if (credentials?.email && credentials?.password) {
                    return {
                        id: credentials.email,
                        email: credentials.email,
                        name: credentials.email.split('@')[0],
                    };
                }
                return null;
            }
        })
    ],
    pages: {
        signIn: '/itime', // Keep user on iTime page
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub || token.email || '';
            }
            return session;
        },
        async jwt({ token, user, account, profile }) {
            if (user) {
                token.id = user.id;
            }

            try {
                await connectDB();

                if (account && account.provider === 'github') {
                    // When user authenticates with github, update their profile
                    const githubProfile = profile as any;
                    const emailToFind = user?.email || token.email;
                    
                    if (emailToFind) {
                        await User.findOneAndUpdate(
                            { email: emailToFind },
                            { 
                                $set: {
                                    githubId: account.providerAccountId,
                                    githubUsername: githubProfile?.login,
                                    githubAccessToken: account.access_token,
                                }
                            },
                            { new: true, upsert: true }
                        );
                    }
                }

                if (token?.email && user) {
                    const profileName = (user as any)?.name || token.name || null;
                    await ensureUserHasDefaultUsername(token.email, profileName);
                }
            } catch (error) {
                console.error('Failed to update DB during auth:', error);
            }

            return token;
        }
    },
    secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-this-in-production",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
