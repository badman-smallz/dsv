import { NextResponse } from 'next/server';

// Required for WebSocket routes
export const dynamic = 'force-dynamic'; // Disable static caching
export const runtime = 'nodejs'; // Use Node.js runtime (required for WebSockets)

// WebSocket upgrade handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId' },
      { status: 400 }
    );
  }

  // Return a simple response (WebSocket upgrade happens elsewhere)
  return NextResponse.json({ status: 'WebSocket route ready' });
}

export async function POST() {
  return new NextResponse('WebSocket route', { status: 200 });
}
