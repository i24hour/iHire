import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        }
    },
    secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-this-in-production",
});

export { handler as GET, handler as POST };
