'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from './LogoutButton';

export default function AdminNavbar() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    };

    fetchUser();
  }, []);

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="font-bold text-lg">
        لوحة الإدارة
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-sm">
            {user.name} ({user.email})
          </div>
        )}
        <LogoutButton />
      </div>
    </nav>
  );
}
