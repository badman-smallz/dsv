"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth(requireAdmin: boolean = false) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (requireAdmin && session.user.role !== "ADMIN") {
      router.push("/dashboard/client");
      return;
    }
  }, [session, status, router, requireAdmin]);

  return {
    user: session?.user,
    isAdmin: session?.user?.role === "ADMIN",
    isLoading: status === "loading",
  };
} 