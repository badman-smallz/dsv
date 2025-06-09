import { prisma } from "@/lib/prisma";
import { generateTrackingCode, getDeliveryStatus, isAdmin } from "@/lib/utils";
import { UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hash } from "bcryptjs";
import { isAdminEmail } from "./config";

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
}) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: isAdminEmail(data.email) ? "ADMIN" : "CLIENT",
      status: isAdminEmail(data.email) ? "VERIFIED" : "PENDING",
    },
  });

  return user;
}

export async function updateUserStatus(userId: string, status: "PENDING" | "VERIFIED") {
  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status,
    },
  });

  return user;
}

export async function createDelivery(data: {
  clientId: string;
  pickupLocation: string;
  deliveryLocation: string;
  startTime: Date;
  estimatedDuration: number;
}) {
  const trackingCode = generateTrackingCode();
  const expectedDeliveryTime = new Date(
    data.startTime.getTime() + data.estimatedDuration * 60 * 1000
  );

  return prisma.delivery.create({
    data: {
      ...data,
      trackingCode,
      expectedDeliveryTime,
    },
  });
}

export async function getDeliveryByTrackingCode(trackingCode: string) {
  const delivery = await prisma.delivery.findUnique({
    where: {
      trackingCode,
    },
    include: {
      client: true,
    },
  });

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  return delivery;
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

export async function getUserDeliveries(userId: string) {
  const deliveries = await prisma.delivery.findMany({
    where: {
      clientId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      client: true,
    },
  });

  return deliveries;
} 