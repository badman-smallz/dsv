# Real-time Chat with WebSockets

This project implements real-time chat functionality using WebSockets with Next.js and Socket.IO.

## Features

- Real-time messaging
- Typing indicators
- Message read receipts
- Online/offline status
- Auto-reconnection
- Optimistic UI updates
- Responsive design

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update the environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_WS_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_here
   DATABASE_URL=your_database_url_here
   ```

3. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

## Architecture

### Client-Side

- **SocketProvider**: Manages WebSocket connection and provides it via React Context
- **ChatWindow**: Main chat component that handles UI and message display
- **Message Components**: For rendering different message types

### Server-Side

- **WebSocket Server**: Handles real-time communication
- **API Routes**: For RESTful operations (messages, conversations, etc.)
- **Database**: Stores messages and conversation data

## Key Files

- `src/providers/socket-provider.tsx`: WebSocket context and connection management
- `src/components/dashboard/chat-window.tsx`: Main chat interface
- `src/app/api/socket/route.ts`: WebSocket API route
- `src/lib/websocket.ts`: WebSocket server logic
- `src/config/websocket.ts`: WebSocket configuration and event types

## Environment Variables

- `NEXT_PUBLIC_WS_URL`: WebSocket server URL (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_SITE_URL`: Your site's URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_URL`: NextAuth.js URL (should match your site URL)
- `NEXTAUTH_SECRET`: Secret for NextAuth.js encryption
- `DATABASE_URL`: Your database connection string

## Deployment

When deploying to production, make sure to:

1. Set appropriate CORS origins in your WebSocket server
2. Use HTTPS in production
3. Set up proper environment variables in your hosting platform
4. Configure WebSocket support in your hosting provider

## Troubleshooting

- **Connection issues**: Check that your WebSocket URL is correct and the server is running
- **Authentication errors**: Verify your NextAuth.js configuration
- **Message not sending**: Check the browser console for errors
- **Messages not updating**: Ensure the WebSocket connection is active

## License

MIT
