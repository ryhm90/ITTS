export const runtime = 'nodejs'; // ضروري لكي لا يكون Edge Runtime

import { NextRequest } from 'next/server';
import { initIO } from '@/lib/socketServer';

export async function GET(req: NextRequest) {
  const server = (globalThis as any).server;

  if (!server) {
    console.error('Server not available!');
    return new Response('Server not available', { status: 500 });
  }

  initIO(server);

  return new Response('Socket initialized');
}
