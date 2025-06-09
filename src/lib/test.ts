import { prisma } from './prisma';

async function testQuery() {
  try {
    const result = await prisma.delivery.findMany({
      take: 1,
      select: {
        id: true,
        trackingCode: true
      }
    });
    console.log("Basic query works:", result);
  } catch (error) {
    console.error("Basic query failed:", error);
  }
}

testQuery(); 