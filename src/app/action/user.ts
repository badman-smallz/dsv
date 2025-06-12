'use server'

import { prisma } from "@/lib/prisma";

export async function updateUserStatus(userId: string, status: "PENDING" | "VERIFIED") {
    await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status,
    },
  });

  return { success: true };
}

export async function getAllUsers() {
  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users;
}