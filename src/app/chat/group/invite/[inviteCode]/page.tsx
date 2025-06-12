'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JoinGroupPage() {
  const router = useRouter();
  const { inviteCode } = useParams();    // استخرج الـ param من الـ URL
  const [group, setGroup] = useState<any>(null);

  useEffect(() => {
    if (!inviteCode) return;
    fetch(`/api/chat/group/invite/${inviteCode}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => setGroup(data.group))
      .catch(() => {
        // هنا ممكن تعرض رسالة خطأ
      });
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode || !group) return;
    await fetch(`/api/chat/group/invite/${inviteCode}/join`, { method: 'POST' });
    router.push(`/chat/group/${group.GroupID}`);
  };

  if (!group) {
    return (
      <div className="p-6 text-center">
        جارٍ تحميل بيانات المجموعة...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">{group.GroupName}</h1>
      {group.Description && <p className="mb-4 text-gray-700">{group.Description}</p>}
      {group.GroupImage && (
        <img
          src={group.GroupImage}
          alt="صورة المجموعة"
          className="mx-auto mb-4 rounded shadow"
        />
      )}
      <button
        onClick={handleJoin}
        className="bg-green-600 text-white py-2 px-4 rounded"
      >
        انضمام إلى المجموعة
      </button>
    </div>
  );
}
