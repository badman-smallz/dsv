import { NextResponse } from 'next/server';
import { ioHandler } from '@/lib/websocket';

// This is a workaround for Next.js 13+ app router
export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse('WebSocket route', { status: 200 });
}

export async function POST() {
  return new NextResponse('WebSocket route', { status: 200 });
}

// This is needed for the WebSocket upgrade
// @ts-ignore
export const config = {
  api: {
    bodyParser: false,
  },
};
