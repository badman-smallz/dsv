import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { getUserDeliveries } from "@/lib/actions";
import { getDeliveryStatus } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { VerificationBanner } from "@/components/dashboard/verification-banner";

export default async function ClientDashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("Session in /dashboard/client:", session);

  if (!session?.user) {
    console.error("No session found. Redirecting to login.");
    return null; // Let middleware handle the redirect
  }

  const deliveries = await getUserDeliveries(session.user.id);

  // Calculate stats without progress
  const stats = {
    totalDeliveries: deliveries.length,
    activeDeliveries: deliveries.filter(
      (delivery) => delivery.status === "IN_TRANSIT"
    ).length,
    completedDeliveries: deliveries.filter(
      (delivery) => delivery.status === "DELIVERED"
    ).length,
  };

  const deliveriesWithProgress = deliveries.map((delivery) => {
    const status = getDeliveryStatus(
      delivery.startTime,
      delivery.expectedDeliveryTime
    );
    const progress = Math.min(
      ((Date.now() - delivery.startTime.getTime()) /
        (delivery.expectedDeliveryTime.getTime() - delivery.startTime.getTime())) *
        100,
      100
    );

    return {
      ...delivery,
      status,
      progress,
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

        <VerificationBanner />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {session.user.status === "VERIFIED" ? (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Deliveries
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalDeliveries}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Active Deliveries
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.activeDeliveries}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Completed Deliveries
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.completedDeliveries}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
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

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Deliveries
            </h3>
            <div className="space-y-4">
              {deliveriesWithProgress.slice(0, 5).map((delivery) => (
                <DeliveryStatus key={delivery.id} delivery={delivery} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 