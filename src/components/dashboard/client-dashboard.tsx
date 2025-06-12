"use client";

import { User, Delivery } from "@prisma/client";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserDeliveries } from "@/lib/actions";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { getDeliveryStatus } from "@/lib/utils";
import { getAuthSession } from "@/lib/auth";

interface ClientDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    status: "PENDING" | "VERIFIED";
  };
}

export default async function ClientDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) return null;

  // Only fetch deliveries for verified users
  const deliveries = session.user.status === "VERIFIED" 
    ? await getUserDeliveries(session.user.id)
    : [];

  // Calculate delivery stats
  const stats = {
    totalDeliveries: deliveries.length,
    activeDeliveries: deliveries.filter(d => d.status === "IN_TRANSIT").length,
    completedDeliveries: deliveries.filter(d => d.status === "DELIVERED").length,
    pendingDeliveries: deliveries.filter(d => d.status === "PENDING").length
  };

  // Calculate progress for each delivery
  const deliveriesWithProgress = deliveries.map(delivery => ({
    ...delivery,
    progress: calculateProgress(delivery),
    status: getDeliveryStatus(delivery.startTime, delivery.expectedDeliveryTime)
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        
        {session.user.status === "PENDING" && (
          <VerificationBanner />
        )}

        <StatsSection stats={stats} isVerified={session.user.status === "VERIFIED"} />
        
        {session.user.status === "VERIFIED" && (
          <RecentDeliveries deliveries={deliveriesWithProgress.slice(0, 5)} />
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
        <div className="flex-shrink-0">
          <ExclamationIcon />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Your account is pending admin verification. Delivery features will be unlocked once verified.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatsSection({ stats, isVerified }: { stats: any, isVerified: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
      <StatCard 
        title="Total Deliveries" 
        value={stats.totalDeliveries} 
        icon={<PackageIcon />}
        enabled={isVerified}
      />
      <StatCard
        title="Active Deliveries"
        value={stats.activeDeliveries}
        icon={<TruckIcon />}
        enabled={isVerified}
      />
      <StatCard
        title="Completed"
        value={stats.completedDeliveries}
        icon={<CheckCircleIcon />}
        enabled={isVerified}
      />
      <StatCard
        title="Pending"
        value={stats.pendingDeliveries}
        icon={<ClockIcon />}
        enabled={isVerified}
      />
    </div>
  );
}

function RecentDeliveries({ deliveries }: { deliveries: any[] }) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Deliveries</h3>
        {deliveries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {deliveries.map(delivery => (
              <DeliveryStatus key={delivery.id} delivery={delivery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

