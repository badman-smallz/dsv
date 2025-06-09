import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        if (user.role === "CLIENT" && user.status === "PENDING") {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
          };
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        };
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redirect clients to /dashboard/client after login
      return `${baseUrl}/dashboard/client`;
    },
    async session({ session, token }) {
      // Attach user role/status to session
      if (token) {
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
    async jwt({ token, user }) {
      // Add role/status to JWT token
      if (user) {
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
  },
  adapter: PrismaAdapter(prisma),
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };