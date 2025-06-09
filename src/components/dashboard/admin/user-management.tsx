"use client";

import { updateUserStatus } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { User, UserStatus } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";

interface UserManagementProps {
  users: User[];
  onUpdate: () => void;
}

export function UserManagement({ users, onUpdate }: UserManagementProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpdateStatus = async (userId: string, status: UserStatus) => {
    try {
      setLoading(userId);
      await updateUserStatus(userId, status);
      toast.success("User status updated successfully");
      onUpdate();
    } catch (error) {
      toast.error("Failed to update user status");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Manage Users
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === "VERIFIED"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.status === "PENDING" ? (
                      <Button
                        onClick={() => handleUpdateStatus(user.id, "VERIFIED")}
                        isLoading={loading === user.id}
                      >
                        Verify User
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => handleUpdateStatus(user.id, "PENDING")}
                        isLoading={loading === user.id}
                      >
                        Revoke Verification
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 