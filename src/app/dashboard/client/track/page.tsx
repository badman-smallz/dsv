"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DeliveryStatus } from "@/components/dashboard/delivery-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDeliveryByTrackingCode } from "@/lib/actions";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import * as z from "zod";
import toast from "react-hot-toast";

const formSchema = z.object({
  trackingCode: z.string().min(1, "Tracking code is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function TrackDeliveryPage() {
  const { data: session, status } = useSession();
  const [delivery, setDelivery] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      const result = await getDeliveryByTrackingCode(data.trackingCode);
      setDelivery(result);
    } catch (error) {
      toast.error("Delivery not found");
      setDelivery(null);
    } finally {
      setIsLoading(false);
    }
  };

    if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (session && session.user.status !== "VERIFIED") {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto">
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
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Track Delivery</h1>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tracking Code
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <Input
                    {...register("trackingCode")}
                    placeholder="Enter tracking code (e.g., DSV-ABC123)"
                    error={errors.trackingCode?.message}
                  />
                  <Button
                    type="submit"
                    className="ml-3"
                    isLoading={isLoading}
                  >
                    Track
                  </Button>
                </div>
              </div>
            </form>

            {delivery && (
              <div className="mt-6">
                <DeliveryStatus delivery={delivery} />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 