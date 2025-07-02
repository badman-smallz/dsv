import { ioHandler } from '@/lib/websocket';
import { NextRequest } from 'next/server';

export const GET = (req: NextRequest) => {
  return new Response(null, { status: 200 });
};

export const POST = (req: NextRequest) => {
  return new Response(null, { status: 200 });
}; 