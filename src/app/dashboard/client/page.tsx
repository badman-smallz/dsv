import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { getUserDeliveries } from "@/lib/actions";
import { getDeliveryStatus } from "@/lib/utils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { VerificationBanner } from "@/components/dashboard/verification-banner";
import Link from "next/link";

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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Dashboard</h1>
          <div className="w-full sm:w-auto">
            <VerificationBanner />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 overflow-x-auto pb-1 sm:pb-0 -mx-2 sm:mx-0 px-2 sm:px-0">
          {/* On mobile, allow horizontal scroll for stats */}
          {session.user.status === "VERIFIED" ? (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg h-full">
                <div className="p-3 sm:p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-50 p-2 rounded-lg">
                      <svg
                        className="h-6 w-6 text-blue-600"
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
                    <div className="ml-4">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Deliveries
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {stats.totalDeliveries}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg h-full">
                <div className="p-3 sm:p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-purple-50 p-2 rounded-lg">
                      <svg
                        className="h-6 w-6 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Completed
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {stats.completedDeliveries}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg h-full">
                <div className="p-3 sm:p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-green-50 p-2 rounded-lg">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Deliveries
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {stats.activeDeliveries}
                      </dd>
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

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Recent Deliveries
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Your recent delivery activities
                </p>
              </div>
              {deliveriesWithProgress.length > 0 && (
                <Link
                  href="/dashboard/client/deliveries"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  View All
                </Link>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200">
            {deliveriesWithProgress.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {deliveriesWithProgress.slice(0, 5).map((delivery) => (
                  <li key={delivery.id} className="hover:bg-gray-50 transition-colors">
                    <Link 
                      href={`/dashboard/client/deliveries/${delivery.id}`}
                      className="block px-4 py-4 sm:px-6"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {delivery.trackingCode}
                        </p>
                        <div className="ml-2 flex-shrink-0">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            delivery.status === 'DELIVERED' 
                              ? 'bg-green-100 text-green-800' 
                              : delivery.status === 'IN_TRANSIT' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {delivery.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="text-sm space-y-1">
                          <p className="text-gray-600 flex items-center">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {delivery.pickupLocation}
                          </p>
                          <p className="text-gray-600 flex items-center">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {delivery.deliveryLocation}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {new Date(delivery.expectedDeliveryTime).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className={`flex flex-col items-center ${delivery.progress > 0 ? 'font-medium text-blue-600' : ''}`}>
                            <span>Picked up</span>
                            {delivery.status === 'PENDING' && <span className="text-[10px] text-green-500">•</span>}
                          </span>
                          <span className={`flex flex-col items-center ${delivery.progress > 33 ? 'font-medium text-blue-600' : ''}`}>
                            <span>In transit</span>
                            {delivery.status === 'IN_TRANSIT' && <span className="text-[10px] text-green-500">•</span>}
                          </span>
                          <span className={`flex flex-col items-center ${delivery.progress > 66 ? 'font-medium text-blue-600' : ''}`}>
                            <span>Delivered</span>
                            {delivery.status === 'DELIVERED' && <span className="text-[10px] text-green-500">•</span>}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              delivery.status === 'DELIVERED' 
                                ? 'bg-green-500' 
                                : delivery.status === 'IN_TRANSIT' 
                                  ? 'bg-blue-500' 
                                  : 'bg-yellow-500'
                            }`}
                            style={{ width: `${delivery.progress}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No deliveries found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new delivery.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/client/deliveries/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    New Delivery
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 