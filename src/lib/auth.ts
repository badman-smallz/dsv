import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions, DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { adminConfig, isAdminEmail } from "./config";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      status?: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as unknown as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Check if it's an admin login
        const adminUser = adminConfig.admins.find(
          (admin) => admin.email === credentials.email
        );

        if (adminUser) {
          if (adminUser.password === credentials.password) {
            return {
              id: "admin-" + credentials.email,
              email: credentials.email,
              name: "Admin User",
              role: "ADMIN",
              status: "VERIFIED"
            } as any; // We need to cast to any here to match the expected User type
          }
          throw new Error("Invalid admin credentials");
        }

        // Regular user login
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: isAdminEmail(user.email) ? "ADMIN" : "CLIENT",
          status: user.status,
        } as any; // We need to cast to any here to match the expected User type
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          role: user.role,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: token.role,
        },
      };
    },
  },
};

import { getServerSession } from "next-auth";

export const getAuthSession = () => getServerSession(authOptions);

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "CLIENT") {
    throw new Error("Invalid credentials");
  }

  // Return the minimal required session data
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };
} 