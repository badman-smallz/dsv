import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export async function POST() {
  const session = await getAuthSession();

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
