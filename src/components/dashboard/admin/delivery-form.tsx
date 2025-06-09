"use client";

import { createDelivery } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { useState } from "react";
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  startTime: z.string().min(1, "Start time is required"),
  estimatedDuration: z.string().min(1, "Duration is required"),
});

type FormData = z.infer<typeof formSchema>;

interface DeliveryFormProps {
  clients: User[];
  onSuccess?: () => void;
}

export function DeliveryForm({ clients, onSuccess }: DeliveryFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      await createDelivery({
        ...data,
        startTime: new Date(data.startTime),
        estimatedDuration: parseInt(data.estimatedDuration),
      });
      toast.success("Delivery created successfully");
      reset();
      router.refresh();
      onSuccess?.(); // Call onSuccess if it exists
    } catch (error) {
      toast.error("Failed to create delivery");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Create New Delivery
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client
            </label>
            <select
              {...register("clientId")}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="mt-1 text-sm text-red-500">{errors.clientId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pickup Location
            </label>
            <Input
              {...register("pickupLocation")}
              error={errors.pickupLocation?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Delivery Location
            </label>
            <Input
              {...register("deliveryLocation")}
              error={errors.deliveryLocation?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Time
            </label>
            <Input
              type="datetime-local"
              {...register("startTime")}
              error={errors.startTime?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estimated Duration (minutes)
            </label>
            <Input
              type="number"
              {...register("estimatedDuration")}
              error={errors.estimatedDuration?.message}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Delivery
          </Button>
        </form>
      </div>
    </div>
  );
} 