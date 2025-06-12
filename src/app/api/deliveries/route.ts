import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);

  // Reject unverified clients
  if (
    session?.user && 
    'role' in session.user && 
    session.user.role === "CLIENT" && 
    'status' in session.user && 
    session.user.status !== "VERIFIED"
  ) {
    return NextResponse.json(
      { error: "Account not verified" },
      { status: 403 }
    );
  }

  // ... rest of your delivery creation logic
}
