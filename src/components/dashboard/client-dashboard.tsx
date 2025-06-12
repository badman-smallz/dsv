import { getUserDeliveries } from "@/lib/actions";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { getDeliveryStatus } from "@/lib/utils";
import { getAuthSession } from "@/lib/auth";
import {
  ExclamationTriangleIcon,
  CubeIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import type { DeliveryWithProgress } from "@/types";
import React from "react";

// This component was a mess. I'm creating placeholders for missing components.
// Placeholder for StatCard
function StatCard({
  title,
  value,
  icon,
  enabled,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  enabled: boolean;
}) {
  const iconContainerClass = `h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ${
    enabled ? "text-gray-600" : "text-gray-400"
  }`;
  return (
    <div
      className={`bg-white p-4 shadow rounded-lg ${
        !enabled && "opacity-50 cursor-not-allowed"
      }`}
    >
      <div className="flex items-center">
        <div className={iconContainerClass}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-lg font-semibold text-gray-900">
            {enabled ? value : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

// Placeholder for EmptyState
function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">No recent deliveries to show.</p>
    </div>
  );
}

export default async function ClientDashboard() {
  const session = await getAuthSession();
  if (!session?.user?.id) return null;

  // Only fetch deliveries for verified users
  const deliveries: DeliveryWithProgress[] =
    session.user.status === "VERIFIED"
      ? await getUserDeliveries(session.user.id)
      : [];

  // Calculate delivery stats
  const stats = {
    totalDeliveries: deliveries.length,
    activeDeliveries: deliveries.filter((d) => d.status === "IN_TRANSIT").length,
    completedDeliveries: deliveries.filter((d) => d.status === "DELIVERED").length,
    pendingDeliveries: deliveries.filter((d) => d.status === "PENDING").length,
  };

  // Calculate progress for each delivery
  const deliveriesWithStatus = deliveries.map((delivery) => ({
    ...delivery,
    status: getDeliveryStatus(delivery.startTime, delivery.expectedDeliveryTime),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

        {session.user.status === "PENDING" && <VerificationBanner />}

        <StatsSection
          stats={stats}
          isVerified={session.user.status === "VERIFIED"}
        />

        {session.user.status === "VERIFIED" && (
          <RecentDeliveries deliveries={deliveriesWithStatus.slice(0, 5)} />
        )}
      </div>
    </DashboardLayout>
  );
}

// Helper components
function VerificationBanner() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0 h-5 w-5 text-yellow-400">
          <ExclamationTriangleIcon />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Your account is pending admin verification. Delivery features will be
            unlocked once verified.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatsSection({
  stats,
  isVerified,
}: {
  stats: {
    totalDeliveries: number;
    activeDeliveries: number;
    completedDeliveries: number;
    pendingDeliveries: number;
  };
  isVerified: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
      <StatCard
        title="Total Deliveries"
        value={stats.totalDeliveries}
        icon={<CubeIcon className="h-5 w-5" />}
        enabled={isVerified}
      />
      <StatCard
        title="Active Deliveries"
        value={stats.activeDeliveries}
        icon={<TruckIcon className="h-5 w-5" />}
        enabled={isVerified}
      />
      <StatCard
        title="Completed"
        value={stats.completedDeliveries}
        icon={<CheckCircleIcon className="h-5 w-5" />}
        enabled={isVerified}
      />
      <StatCard
        title="Pending"
        value={stats.pendingDeliveries}
        icon={<ClockIcon className="h-5 w-5" />}
        enabled={isVerified}
      />
    </div>
  );
}

type DeliveryWithStatus = DeliveryWithProgress & { status: string };

function RecentDeliveries({
  deliveries,
}: {
  deliveries: DeliveryWithStatus[];
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Recent Deliveries
        </h3>
        {deliveries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <DeliveryStatus key={delivery.id} delivery={delivery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
