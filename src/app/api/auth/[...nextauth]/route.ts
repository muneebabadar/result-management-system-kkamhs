// import NextAuth from "next-auth";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import prisma from "@/lib/prisma";
// import type { NextAuthOptions } from "next-auth";
// import bcrypt from "bcrypt";

// export const authOptions: NextAuthOptions = {
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     {
//       id: "admin",
//       name: "Admin",
//       type: "credentials",
//       credentials: {
//         email: { label: "Email", type: "email" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials: Record<string, string> | undefined) {
//         // Check if credentials are provided
//         if (!credentials || !credentials.email || !credentials.password) {
//           return null;
//         }

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email },
//         });

//         if (user && await bcrypt.compare(credentials.password, user.password)) {
//           return { id: user.id, name: user.name, email: user.email };
//         }
//         return null;
//       },
//     },
//   ],
//   session: { strategy: "jwt" },
//   pages: { signIn: "/login" },
//   callbacks: {
//     async redirect({ url, baseUrl }) {
//       if (url === baseUrl + "/login") return baseUrl + "/login";
//       if (url.startsWith("/admin")) return baseUrl + "/admin";
//       return baseUrl;
//     },
//     async session({ session, token }) {
//       if (token.sub) session.user.id = token.sub;
//       return session;
//     },
//   },
// };

// const handler = NextAuth(authOptions);
// export { handler as GET, handler as POST };


import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    {
      id: "admin",
      name: "Admin",
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        console.log("Credentials received:", credentials);
        if (!credentials || !credentials.email || !credentials.password) {
          console.log("No credentials or missing email/password");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        console.log("User found:", user);
        if (!user) {
          console.log(`User not found for email: ${credentials.email}`);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log("Password comparison result:", isValid);
        if (isValid) {
          console.log(`Login successful for ${credentials.email}`);
          return { id: user.id, name: user.name, email: user.email };
        } else {
          console.log(`Password mismatch for ${credentials.email}`);
          return null;
        }
      },
    },
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url === baseUrl + "/login") return baseUrl + "/login";
      if (url.startsWith("/admin")) return baseUrl + "/admin";
      return baseUrl;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };