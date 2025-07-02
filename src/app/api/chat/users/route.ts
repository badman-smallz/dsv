import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    console.log('Token:', token);

    if (!token) {
      console.log('No token');
      return NextResponse.json([], { status: 200 });
    }

    const { sub: id, role, status } = token;
    console.log('Token user:', { id, role, status });

    if (role === 'ADMIN') {
      const clients = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          status: 'VERIFIED',
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      });
      console.log('Clients found:', clients);
      return NextResponse.json(clients);
    } else if (role === 'CLIENT') {
      const admins = await prisma.$queryRaw`SELECT id, name, email, status FROM "User" WHERE role = 'ADMIN'`;
      return NextResponse.json(admins);
    } else {
      return NextResponse.json([], { status: 200 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
