'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { showToast } from '@/lib/toast';

export default function EditRequestPage() {
  const { id } = useParams();
  const router = useRouter();

  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    fetch(`/api/requests/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data) {
          setTitle(data.Title);
          setDesc(data.Description);
          setNotes(data.Notes);
        } else {
          showToast({ type: 'error', message: 'الطلب غير موجود' });
          router.push('/dashboard/requests');
        }
      })
      .catch(() => showToast({ type: 'error', message: 'فشل جلب بيانات الطلب' }))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, notes }),
      credentials: 'include'
    });
    setSaving(false);

    if (res.ok) {
      showToast({ type: 'success', message: 'تم حفظ التعديلات' });
      router.push('/dashboard/requests');
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'فشل الحفظ' });
    }
  };

  if (loading) return null;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-right">تعديل الطلب #{id}</h1>
      <form onSubmit={handleSubmit}>
        <label className="block text-right mb-1">الموضوع</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full mb-4 p-2 border rounded text-right"
        />

        <label className="block text-right mb-1">تفاصيل الطلب</label>
        <textarea
          value={description}
          onChange={e => setDesc(e.target.value)}
          className="w-full mb-4 p-2 border rounded h-24 text-right"
        />

        <label className="block text-right mb-1">ملاحظات إضافية</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full mb-6 p-2 border rounded h-16 text-right"
        />

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white py-2 px-4 rounded w-full"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </form>
    </div>
  );
}
