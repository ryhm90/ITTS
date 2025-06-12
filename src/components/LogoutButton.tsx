'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('تم تسجيل الخروج بنجاح.');
        router.push('/login');
      } else {
        toast.error('فشل تسجيل الخروج، حاول مرة أخرى.');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج.');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
    >
      تسجيل الخروج
    </button>
  );
}
