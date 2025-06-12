import { Delivery } from "@prisma/client";

export type DeliveryWithProgress = Delivery & {
  progress: number; // This is calculated, not stored in DB
  client: any; // Replace with your actual client type if available
};

import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "CLIENT";
    status: "PENDING" | "VERIFIED";
  }
}