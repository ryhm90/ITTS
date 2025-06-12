'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewDirectivePage() {
  const [requestId, setRequestId] = useState('');
  const [directiveText, setDirectiveText] = useState('');
  const router = useRouter();

  const handleSendDirective = async () => {
    const res = await fetch('/api/admin/directives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        directiveText,
      }),
    });

    if (res.ok) {
      alert('تم إرسال التوجيه بنجاح');
      router.push('/admin/directives');
    } else {
      const data = await res.json();
      alert(data.error || 'فشل إرسال التوجيه');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-right">
      <h1 className="text-2xl font-bold mb-6">إرسال توجيه جديد</h1>

      <input
        type="text"
        placeholder="رقم الطلب المرتبط"
        value={requestId}
        onChange={(e) => setRequestId(e.target.value)}
        className="w-full p-2 border rounded mb-4 text-right"
      />

      <textarea
        placeholder="نص التوجيه"
        value={directiveText}
        onChange={(e) => setDirectiveText(e.target.value)}
        className="w-full p-2 border rounded mb-6 h-32 text-right"
      />

      <button
        onClick={handleSendDirective}
        className="bg-green-600 text-white py-2 px-4 rounded w-full"
      >
        إرسال التوجيه
      </button>
    </div>
  );
}
