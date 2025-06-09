import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { getUserDeliveries } from "@/lib/actions";
import { getDeliveryStatus } from "@/lib/utils";
import { getAuthSession } from "@/lib/auth";

export default async function ClientDeliveriesPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) return null;

  if (session.user.status !== "VERIFIED") {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto">
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
        </div>
      </DashboardLayout>
    );
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
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {deliveriesWithProgress.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No deliveries found
                </p>
              ) : (
                deliveriesWithProgress.map((delivery) => (
                  <DeliveryStatus key={delivery.id} delivery={delivery} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 