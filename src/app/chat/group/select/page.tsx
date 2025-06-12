'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectGroupPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      const res = await fetch('/api/chat/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    };
    fetchGroups();
  }, []);

  const handleSelectGroup = (groupId: number) => {
    router.push(`/chat/group/${groupId}`);
  };

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-6">اختر مجموعة</h1>

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <button
            key={group.GroupID}
            onClick={() => handleSelectGroup(group.GroupID)}
            className="bg-blue-600 text-white py-2 px-4 rounded"
          >
            {group.GroupName}
          </button>
        ))}
      </div>
    </div>
  );
}
