import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { getUserDeliveries } from "@/lib/actions";
import { getDeliveryStatus } from "@/lib/utils";
import { getAuthSession } from "@/lib/auth";

export default async function ClientDashboardPage() {
  const session = await getAuthSession();
  console.log("Session in /dashboard/client:", session);

  if (!session?.user) {
    console.error("No session found. Redirecting to login.");
    return null; // Let middleware handle the redirect
  }

  const deliveries = await getUserDeliveries(session.user.id);

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
      client: session.user,
    };
  });

  const stats = {
    totalDeliveries: deliveries.length,
    activeDeliveries: deliveries.filter(
      (delivery) => delivery.status === "IN_TRANSIT"
    ).length,
    completedDeliveries: deliveries.filter(
      (delivery) => delivery.status === "DELIVERED"
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
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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