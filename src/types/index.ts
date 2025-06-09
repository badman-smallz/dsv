import { Delivery, User } from "@prisma/client";

export type DeliveryWithProgress = Delivery & {
  progress: number;
  client: User;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "CLIENT";
      status: "PENDING" | "VERIFIED";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "CLIENT";
    status: "PENDING" | "VERIFIED";
  }
} 