//src/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async session({ session, token }) {
      // Add role to session
      if (token.role) {
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      // Add role to token when user logs in
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
        authorized({ auth, request: {nextUrl} }) {
            const role = auth?.user?.role;
            const path = nextUrl.pathname;

            if (path.startsWith("/admin")) {
                return role === "admin";
            }

            if (path.startsWith("/teacher")) {
                return role === "teacher";
            }

            return true; // Allow other routes
        },
    },
    providers: [],
} satisfies NextAuthConfig;
