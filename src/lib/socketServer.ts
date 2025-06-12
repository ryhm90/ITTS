import { Server } from 'socket.io';
import type { Server as NetServer } from 'http';

let io: Server | null = null;

export function initIO(server: NetServer) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log(`🔵 New client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`🔴 Client disconnected: ${socket.id}`);
      });
    });
  }
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}
