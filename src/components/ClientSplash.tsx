// src/components/ClientSplash.tsx
'use client';

import dynamic from 'next/dynamic';

const SplashScreen = dynamic(
  () => import('@/components/SplashScreen'),
  { ssr: false }
);

export default function ClientSplash({ children }: { children: React.ReactNode }) {
  return <SplashScreen>{children}</SplashScreen>;
}
