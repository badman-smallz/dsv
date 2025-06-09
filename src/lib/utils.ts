import { UserRole, UserStatus } from "@prisma/client";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTrackingCode(): string {
  const prefix = "DSV";
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomPart}`;
}

export function calculateDeliveryProgress(
  startTime: Date,
  expectedDeliveryTime: Date,
  currentTime: Date = new Date()
): number {
  const total = expectedDeliveryTime.getTime() - startTime.getTime();
  const passed = currentTime.getTime() - startTime.getTime();
  return Math.min((passed / total) * 100, 100);
}

export function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(email);
}

export function getDeliveryStatus(
  startTime: Date,
  expectedDeliveryTime: Date,
  currentTime: Date = new Date()
): "PENDING" | "IN_TRANSIT" | "DELIVERED" | "EXPIRED" {
  const progress = calculateDeliveryProgress(startTime, expectedDeliveryTime, currentTime);
  const buffer = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  if (currentTime < startTime) return "PENDING";
  if (currentTime > new Date(expectedDeliveryTime.getTime() + buffer)) return "EXPIRED";
  if (progress >= 100) return "DELIVERED";
  return "IN_TRANSIT";
} 