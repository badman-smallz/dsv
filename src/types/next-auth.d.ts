import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CLIENT";
      status: "PENDING" | "VERIFIED";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "CLIENT";
    status: "PENDING" | "VERIFIED";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "CLIENT";
    status: "PENDING" | "VERIFIED";
  }
}