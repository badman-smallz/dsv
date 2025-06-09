'use server'

import { prisma } from "@/lib/prisma";
import { generateTrackingCode } from "@/lib/utils";

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

  const delivery = await prisma.delivery.create({
    data: {
      ...data,
      trackingCode,
      expectedDeliveryTime,
    },
  });

  return { success: true, trackingCode: delivery.trackingCode };
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