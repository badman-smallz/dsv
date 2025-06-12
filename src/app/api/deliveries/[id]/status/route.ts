import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: params.id },
  });

  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  const currentStatus = delivery.status;
  let nextStatus: typeof currentStatus;

  switch (currentStatus) {
    case "PENDING":
      nextStatus = "ASSIGNED";
      break;
    case "ASSIGNED":
      nextStatus = "PICKED_UP";
      break;
    case "PICKED_UP":
      nextStatus = "IN_TRANSIT";
      break;
    case "IN_TRANSIT":
      nextStatus = "DELIVERED";
      break;
    default:
      return NextResponse.json(
        { error: "Cannot update status further" },
        { status: 400 }
      );
  }

  const updatedDelivery = await prisma.delivery.update({
    where: { id: params.id },
    data: { status: nextStatus },
  });

  return NextResponse.json(updatedDelivery);
}