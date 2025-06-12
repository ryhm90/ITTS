'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { showToast } from '@/lib/toast';

interface User {
  UserID: number;
  FullName: string;
  Username: string;
}

export default function ChatUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/chat/users', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        } else {
          showToast({ type: 'error', message: 'فشل تحميل المستخدمين' });
        }
      } catch (err) {
        console.error(err);
        showToast({ type: 'error', message: 'خطأ في الشبكة' });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto text-right">
      <h1 className="text-2xl font-bold mb-6">اختر مستخدمًا لبدء المحادثة</h1>

      {loading ? (
        <p className="text-center">جارٍ التحميل...</p>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-600">لا يوجد مستخدمون متاحون</p>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.UserID} className="border-b pb-2">
              <Link
                href={`/chat/${user.UserID}`}
                className="text-blue-600 hover:underline"
              >
                {user.FullName} ({user.Username})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
