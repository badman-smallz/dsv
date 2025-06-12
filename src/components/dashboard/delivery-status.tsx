"use client";

import { DeliveryWithProgress } from "@/types";
import { formatDistanceToNow } from "date-fns";

export function DeliveryStatus({ delivery }: { delivery: DeliveryWithProgress }) {
  const statusColors = {
    PENDING: "bg-yellow-500",
    ASSIGNED: "bg-blue-400",
    PICKED_UP: "bg-blue-500", 
    IN_TRANSIT: "bg-blue-600",
    DELIVERED: "bg-green-500",
    EXPIRED: "bg-red-500"
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">#{delivery.trackingCode}</h3>
        <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColors[delivery.status]}`}>
          {delivery.status.replace("_", " ")}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${delivery.progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">From</p>
          <p>{delivery.pickupLocation}</p>
        </div>
        <div>
          <p className="text-gray-500">To</p>
          <p>{delivery.deliveryLocation}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Started</p>
          <p>{formatDistanceToNow(delivery.startTime, { addSuffix: true })}</p>
        </div>
        <div>
          <p className="text-gray-500">Expected</p>
          <p>{formatDistanceToNow(delivery.expectedDeliveryTime, { addSuffix: true })}</p>
        </div>
      </div>
    </div>
  );
} 