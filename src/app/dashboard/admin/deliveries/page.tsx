import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryForm } from "@/components/dashboard/admin/delivery-form";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { getAllUsers } from "@/lib/actions";
import prisma from "@/lib/prisma";
import { getDeliveryStatus } from "@/lib/utils";

export default async function AdminDeliveriesPage() {
  const [users, deliveries] = await Promise.all([
    getAllUsers(),
    prisma.delivery.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true },
    }),
  ]);

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
        <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <DeliveryForm clients={users} />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Deliveries
                </h3>
                <div className="space-y-4">
                  {deliveriesWithProgress.map((delivery) => (
                    <DeliveryStatus key={delivery.id} delivery={delivery} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 