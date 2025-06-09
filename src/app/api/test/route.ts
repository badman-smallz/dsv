import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const count = await prisma.user.count();
    return Response.json({ success: true, count });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 