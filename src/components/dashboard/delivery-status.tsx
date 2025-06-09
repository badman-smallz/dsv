"use client";

import { DeliveryWithProgress } from "@/types";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface DeliveryStatusProps {
  delivery: DeliveryWithProgress;
}

export function DeliveryStatus({ delivery }: DeliveryStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500";
      case "IN_TRANSIT":
        return "bg-blue-500";
      case "DELIVERED":
        return "bg-green-500";
      case "EXPIRED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Tracking Code: {delivery.trackingCode}
          </h3>
          <span
            className={`px-2 py-1 rounded-full text-white text-sm ${getStatusColor(
              delivery.status
            )}`}
          >
            {delivery.status}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Progress</p>
            <div className="mt-1 relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={`absolute top-0 left-0 h-full ${getStatusColor(
                  delivery.status
                )}`}
                initial={{ width: 0 }}
                animate={{ width: `${delivery.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="mt-1 text-sm text-gray-600">{delivery.progress}% Complete</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">From</p>
              <p className="mt-1 text-sm text-gray-900">{delivery.pickupLocation}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">To</p>
              <p className="mt-1 text-sm text-gray-900">
                {delivery.deliveryLocation}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Started</p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDistanceToNow(new Date(delivery.startTime), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Expected Delivery</p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDistanceToNow(new Date(delivery.expectedDeliveryTime), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Client</p>
            <p className="mt-1 text-sm text-gray-900">
              {delivery.client.name} ({delivery.client.email})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 