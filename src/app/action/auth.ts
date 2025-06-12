'use server'

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { isAdminEmail } from "@/lib/config";

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
}) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      throw new Error("Email already exists");
    }

    const hashedPassword = await hash(data.password, 10);

        await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: isAdminEmail(data.email) ? "ADMIN" : "CLIENT",
        status: isAdminEmail(data.email) ? "VERIFIED" : "PENDING",
      },
    });

    // Don't return the user object directly to avoid exposing sensitive data
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An error occurred during registration");
  }
}