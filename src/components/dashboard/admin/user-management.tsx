"use client";

import { updateUserStatus } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { User, UserStatus, UserRole } from "@prisma/client"; // Added UserRole
import { useState } from "react";
import { useRouter } from 'next/navigation';
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UserManagementProps {
  users: User[];
  onUpdate?: () => void;
}

export function UserManagement({ users }: UserManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | UserRole>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | UserStatus>("ALL");

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "ALL" || user.role === filterRole;
    const matchesStatus = filterStatus === "ALL" || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUpdateStatus = async (userId: string, status: UserStatus) => {
    try {
      setLoading(userId);
      await updateUserStatus(userId, status);
      toast.success("User status updated successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update user status");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CLIENT">Client</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
        </div>
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
              {filteredUsers.map((user) => (
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