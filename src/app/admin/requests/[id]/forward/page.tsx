'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';

type UserContext = {
  department: { id: number; name: string };
};

type SectionItem = {
  id: number;
  name: string;
};

export default function ForwardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  // 1) جلب سياق المستخدم
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          showToast({ type: 'error', message: data.error });
          router.push('/admin/dashboard');
        } else {
          setCtx(data);
        }
      })
      
      .catch(() => {
        showToast({ type: 'error', message: 'خطأ في المصادقة' });
        router.push('/admin/dashboard');
      })
      .finally(() => setLoading(false));
  }, [router]);

  // 2) جلب الشعب بناءً على departmentId
  useEffect(() => {
    if (!ctx) return;
    fetch(`/api/sections?departmentId=${ctx.department.id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setSections)
      .catch(() => showToast({ type: 'error', message: 'فشل في جلب الشعب' }));
  } , [ctx]);

  // 3) تنفيذ تحويل الطلب
  const handleForward = async () => {
    if (!selectedSection) {
      showToast({ type: 'error', message: 'يرجى اختيار شعبة' });
      return;
    }
    const sec = sections.find(s => s.id === selectedSection)!;
    const res = await fetch(`/api/admin/requests/${id}/forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ division: sec.name, divisionID: sec.id, note }),
    });
    if (res.ok) {
      showToast({ type: 'success', message: 'تم التحويل إلى مدير الشعبة' });
      router.push('/admin/dashboard');
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'فشل في التحويل' });
    }
  };

  if (loading) return null;

  return (
    <div className="p-6 max-w-md mx-auto text-right">
      <h1 className="text-xl font-bold mb-4">تحويل طلب #{id} إلى مدير الشعبة</h1>

      <select
        key="section-select"
        className="w-full mb-4 p-2 border rounded"
        value={selectedSection}
        onChange={e => setSelectedSection(e.target.value ? +e.target.value : '')}
      >
        <option key="default" value="">
          — اختر شعبة —
        </option>
        {sections.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <textarea
        className="w-full mb-4 p-2 border rounded h-24"
        placeholder="ملاحظة (اختياري)"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-300 rounded"
          onClick={() => router.back()}
        >
          إلغاء
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={handleForward}
        >
          تأكيد التحويل
        </button>
      </div>
    </div>
  );
}
