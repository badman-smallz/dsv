"use client";

import { User, Delivery } from "@prisma/client";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserDeliveries } from "@/lib/actions";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

interface ClientDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    status: "PENDING" | "VERIFIED";
  };
}

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const deliveries = session.user.status === "VERIFIED" 
    ? await getUserDeliveries(session.user.id)
    : [];

  const deliveriesWithProgress = deliveries.map((delivery: Delivery) => {
    // ... existing progress calculation ...
  });

  const stats = {
    totalDeliveries: deliveries.length,
    activeDeliveries: deliveries.filter(
      (delivery: Delivery) => delivery.status === "IN_TRANSIT"
    ).length,
    completedDeliveries: deliveries.filter(
      (delivery: Delivery) => delivery.status === "DELIVERED"
    ).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

        {session.user.status === "PENDING" && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your account is pending admin verification. Delivery features will be unlocked once you're verified.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Only show delivery stats if verified */}
          {session.user.status === "VERIFIED" ? (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                {/* ... delivery stats cards ... */}
              </div>
            </>
          ) : (
            <div className="sm:col-span-3 bg-white p-6 rounded-lg shadow border-l-4 border-gray-300">
              <h2 className="text-xl font-semibold mb-2">Delivery Features</h2>
              <p className="text-gray-600 mb-4">
                These features will unlock once your account is verified by an admin.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

