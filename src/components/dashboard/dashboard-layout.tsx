"use client";

import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();

  const navigation = [
    ...(isAdmin
      ? [
          { name: "Dashboard", href: "/dashboard/admin" },
          { name: "Users", href: "/dashboard/admin/users" },
          { name: "Deliveries", href: "/dashboard/admin/deliveries" },
        ]
      : [
          { name: "Dashboard", href: "/dashboard/client" },
          ...(user?.status === "VERIFIED"
            ? [
                { name: "My Deliveries", href: "/dashboard/client/deliveries" },
                { name: "Track Delivery", href: "/dashboard/client/track" },
              ]
            : []),
        ]),
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-900">
                  DSV Global
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname === item.href
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.name || "User"}
              </span>
              <Button
                variant="secondary"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 