'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
      <h1 className="text-4xl font-bold mb-4">نظام تتبع الطلبات</h1>
      <p className="text-lg mb-8">يرجى تسجيل الدخول أو إنشاء حساب جديد للمتابعة</p>
      <div className="space-x-4">
        <button
          onClick={() => router.push('/login')}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          تسجيل الدخول
        </button>

      </div>
    </main>
  );
}
