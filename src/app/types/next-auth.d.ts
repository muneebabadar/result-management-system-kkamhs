// src/types/next-auth.d.ts
import { User as DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string; // Add role to User type
  }

  interface Session {
    user: {
      role?: string;
    } & DefaultUser;
  }
}