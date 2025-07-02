"use client";

import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import AdminResetUsersButton from "./admin-reset-users";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

import React, { useState, useEffect } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatWindow } from "./chat-window";

// Declare state types for clarity

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  // Fetch unread status for badge
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/chat/conversations');
        const data = await res.json();
        setHasUnread(Array.isArray(data) && data.some((c: any) => c.unread > 0));
      } catch (e) {
        setHasUnread(false);
      }
    }
    fetchUnread();
    // Optionally: Listen for real-time updates with socket
  }, []);

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
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Hamburger */}
            <div className="flex items-center">
              <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">
                DSV Global
              </Link>
              {/* Mobile Chat Button - Only show on mobile */}
              <div className="sm:hidden ml-2">
                <button
                  onClick={() => setChatOpen(true)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {hasUnread && (
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </button>
              </div>
              {/* Hamburger menu (mobile) */}
              <div className="sm:hidden ml-1">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-controls="mobile-menu"
                  aria-expanded={openMobileMenu ? "true" : "false"}
                  onClick={() => setOpenMobileMenu((open) => !open)}
                >
                  <span className="sr-only">Open main menu</span>
                  {openMobileMenu ? (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Desktop nav */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-2 md:space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-2 py-1 md:px-3 md:py-2 text-sm font-medium rounded-md transition-colors ${
                      pathname === item.href
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                {/* Chat button */}
                <button
                  onClick={() => setChatOpen((open) => !open)}
                  className={`relative ml-2 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    chatOpen 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
              </div>
            </div>
            {/* User & Sign Out */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="hidden xs:inline-flex text-gray-700 text-sm truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">
                Welcome, {user?.name?.split(' ')[0] || "User"}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <span className="hidden sm:inline">Sign Out</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        <div 
          className={`sm:hidden fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity duration-300 ${
            openMobileMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setOpenMobileMenu(false)}
        >
          <div 
            className={`absolute right-0 top-0 h-full w-4/5 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
              openMobileMenu ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Menu</h3>
                  <button
                    onClick={() => setOpenMobileMenu(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close menu</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-3 py-2.5 rounded-md text-base font-medium ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setOpenMobileMenu(false)}
                  >
                    <div className="flex items-center">
                      <span>{item.name}</span>
                      {pathname === item.href && (
                        <svg className="ml-auto h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setChatOpen(true);
                    setOpenMobileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat {hasUnread && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
              </div>
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email || ''}</p>
                  </div>
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat sidebar/modal */}
      <div 
        className={`fixed inset-0 z-40 flex transition-opacity duration-300 ${
          chatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={() => setChatOpen(false)}
        ></div>
        
        <div 
          className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            chatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {activeConversation ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-3 border-b bg-white">
                <button 
                  onClick={() => setActiveConversation(null)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </button>
                <h3 className="font-medium text-gray-900">Chat</h3>
                <button 
                  onClick={() => setChatOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow 
                  conversationId={activeConversation} 
                  onBack={() => setActiveConversation(null)}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-3 border-b bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Messages</h3>
                  <button 
                    onClick={() => setChatOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChatSidebar
                  onSelect={(id) => {
                    setActiveConversation(id);
                    // On mobile, we want to keep the chat open when selecting a conversation
                    if (window.innerWidth < 640) {
                      setChatOpen(true);
                    }
                  }}
                  activeId={activeConversation}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-3 sm:py-4 px-3 sm:px-4 lg:px-6">
        {/* Show admin reset button only for admins */}
        {isAdmin && <AdminResetUsersButton />}
        {children}
      </main>
    </div>
  );
} 