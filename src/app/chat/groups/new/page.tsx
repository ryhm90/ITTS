'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('/api/chat/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateGroup = async () => {
    const res = await fetch('/api/chat/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupName, members: selectedUsers }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/chat/group/${data.groupId}`);
    }
  };

  const toggleUserSelection = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-right">
      <h1 className="text-2xl font-bold mb-6">إنشاء مجموعة جديدة</h1>

      <input
        type="text"
        placeholder="اسم المجموعة"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="w-full p-2 border rounded mb-6"
      />

      <h2 className="text-xl mb-2">اختر الأعضاء:</h2>
      <div className="flex flex-col gap-2 mb-6 max-h-64 overflow-y-auto">
        {users.map((user) => (
          <label key={user.UserID} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedUsers.includes(user.UserID)}
              onChange={() => toggleUserSelection(user.UserID)}
            />
            {user.FullName}
          </label>
        ))}
      </div>

      <button onClick={handleCreateGroup} className="bg-green-600 text-white py-2 px-4 rounded w-full">
        إنشاء المجموعة
      </button>
    </div>
  );
}
