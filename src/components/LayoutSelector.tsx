'use client';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import ClientLayout from './ClientLayout';

interface Props {
  children: ReactNode;
}

export default function LayoutSelector({ children }: Props) {
  const pathname = usePathname();

  // إذا كان المسار /login أو /signup لا نغلف بالشاشة الرئيسية
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    return <>{children}</>;
  }

  // خلاف ذلك، نستخدم ClientLayout
  return (
    <ClientLayout>
      <main className="min-h-screen pt-4 px-4 md:px-8 lg:px-12">
        {children}
      </main>
    </ClientLayout>
  );
}
