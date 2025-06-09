import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { UserManagement } from "@/components/dashboard/admin/user-management";
import { getAllUsers } from "@/lib/actions";

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <UserManagement users={users} onUpdate={() => {}} />
      </div>
    </DashboardLayout>
  );
} 