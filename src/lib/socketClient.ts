'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket() {
  if (!socket) {
    socket = io('/', {
      path: '/api/socket', // فقط إذا كنت مهيأ socket.io API تحت هذا المسار
      transports: ['websocket'], // أفضل أن تحدد ويب سوكيت مباشرة
    });
  }
  return socket;
}
