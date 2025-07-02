import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions, DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { adminConfig, isAdminEmail } from "./config";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
    } & DefaultSession["user"];
  }
  interface User {
    role: UserRole;
    status: UserStatus;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    role: UserRole;
    status: UserStatus;
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Check if it's an admin login
        const adminUser = adminConfig.admins.find(
          (admin) => admin.email === credentials.email
        );

        if (adminUser) {
          if (adminUser.password === credentials.password) {
            // Find or create the admin user in the database
            const admin = await prisma.user.upsert({
              where: { email: credentials.email },
              update: {},
              create: {
                email: credentials.email,
                name: "Admin User",
                password: "", // Password is not used for admin login
                role: "ADMIN",
                status: "VERIFIED"
              },
            });

            return {
              id: admin.id, // Use the database ID
              email: admin.email,
              name: admin.name || "Admin User",
              role: admin.role,
              status: admin.status
            };
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign-in, add custom claims from the user object
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.status = user.status;
        console.log('JWT callback (user):', { sub: token.sub, role: token.role, status: token.status });
      }

      // Admins don't need a database refresh for status
      if (token.role === "ADMIN") {
        return token;
      }

      // Handle a custom trigger to update the session
      if (trigger === "update" && session?.user?.status) {
        token.status = session.user.status;
        return token;
      }

      // For client users, on subsequent requests, refresh status from the database
      // Use `token.sub` which is the standard JWT subject and holds the user ID
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
        });

        if (dbUser) {
          token.status = dbUser.status;
          token.role = dbUser.role; // Role shouldn't change, but good practice
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
        session.user.status = token.status;
        console.log('Session callback:', session.user);
      }
      return session;
    },
  },
};
 