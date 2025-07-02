import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import SocketIOServer from '../lib/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Port configuration
const PORT = parseInt(process.env.PORT || '3000', 10);

app.prepare().then(() => {
  // Create HTTP server for Next.js
  const httpServer = createServer((req, res) => {
    if (!req.url) return;
    const parsedUrl = parse(req.url, true);
    
    // Log incoming requests (except for socket.io)
    if (!req.url.startsWith('/socket.io/')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    
    handle(req, res, parsedUrl);
  });

  // Initialize WebSocket server with the HTTP server
  const socketServer = new SocketIOServer(httpServer);
  
  // Start the WebSocket server
  socketServer.start();
  
  // Start the HTTP server
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket server running on port ${PORT}`);
  });

  // Handle server shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    httpServer.close(() => {
      console.log('HTTP server closed');
      socketServer.stop();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
});
