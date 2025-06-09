import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/dashboard/admin");
    const isClientRoute = req.nextUrl.pathname.startsWith("/dashboard/client");
    const isClientDashboard = req.nextUrl.pathname === "/dashboard/client";

    // Protect admin routes
    if (isAdminRoute && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/client", req.url));
    }

    // Protect client routes
    if (isClientRoute && token?.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard/admin", req.url));
    }

    // Allow access to tracking without verification
    if (req.nextUrl.pathname === "/dashboard/client/track") {
      return NextResponse.next();
    }

    // Allow unverified clients to access ONLY the dashboard
    if (
      token?.role === "CLIENT" &&
      token?.status === "PENDING" &&
      !isClientDashboard
    ) {
      return NextResponse.redirect(new URL("/dashboard/client", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  });
  
  export const config = {
    matcher: ["/dashboard/:path*"],
  };