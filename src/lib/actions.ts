'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from 'next/cache';
import { generateTrackingCode, getDeliveryStatus, isAdmin } from "@/lib/utils";
import { UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hash } from "bcryptjs";
import { isAdminEmail } from "./config";
import { calculateDeliveryProgress } from './utils';

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

  revalidatePath('/dashboard/admin/users'); // Revalidate the users page
  revalidatePath('/dashboard/admin'); // Also revalidate the main admin dashboard if it shows user stats

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

  const newDelivery = await prisma.delivery.create({
    data: {
      ...data,
      trackingCode,
      expectedDeliveryTime,
      // TODO: Address missing createdById if necessary based on schema
    },
  });

  revalidatePath('/dashboard/admin/deliveries'); // Revalidate the deliveries page
  revalidatePath('/dashboard/admin'); // Also revalidate the main admin dashboard if it shows delivery stats
  revalidatePath('/dashboard/client/deliveries'); // Also revalidate client deliveries page

  return newDelivery;
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

  const progress = calculateDeliveryProgress(delivery.startTime, delivery.expectedDeliveryTime);
  const status = getDeliveryStatus(delivery.startTime, delivery.expectedDeliveryTime);

  return {
    ...delivery,
    progress,
    status,
  };
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

  // Calculate progress for each delivery
  return deliveries.map(delivery => ({
    ...delivery,
    progress: calculateDeliveryProgress(
      delivery.startTime,
      delivery.expectedDeliveryTime
    )
  }));
}

export async function getAllDeliveries() {
  // Minimal query with no progress reference
  const deliveries = await prisma.delivery.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Add progress calculation AFTER the query
  return deliveries.map(delivery => ({
    ...delivery,
    progress: calculateDeliveryProgress(
      delivery.startTime,
      delivery.expectedDeliveryTime
    )
  }));
} 