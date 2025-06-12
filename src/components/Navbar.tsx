'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <button onClick={logout} className="text-red-600 hover:underline">
      تسجيل الخروج
    </button>
  );
}
