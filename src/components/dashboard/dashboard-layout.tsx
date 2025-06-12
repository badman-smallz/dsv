"use client";

import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

import React, { useState } from "react";

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

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
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Hamburger */}
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                DSV Global
              </Link>
              {/* Hamburger menu (mobile) */}
              <div className="sm:hidden ml-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-controls="mobile-menu"
                  aria-expanded={openMobileMenu ? "true" : "false"}
                  onClick={() => setOpenMobileMenu((open) => !open)}
                >
                  <span className="sr-only">Open main menu</span>
                  {/* Hamburger icon */}
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              {/* Desktop nav */}
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
            {/* User & Sign Out */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm truncate max-w-[100px]">
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
        {/* Mobile menu */}
        {openMobileMenu && (
          <div className="sm:hidden" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setOpenMobileMenu(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-4 px-2 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 