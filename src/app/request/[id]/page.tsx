'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function RequestDetailsPage() {
  const { id } = useParams();
  const [details, setDetails] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [chat, setChat] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    const fetchData = async () => {
      const [reqRes, timelineRes, chatRes] = await Promise.all([
        fetch(`/api/requests/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/requests/${id}/timeline`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/requests/${id}/chat`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setDetails(await reqRes.json());
      setTimeline(await timelineRes.json());
      setChat(await chatRes.json());
    };
    fetchData();
  }, [id]);

  const sendReply = async () => {
    setSending(true);
    await fetch(`/api/requests/${id}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message: reply })
    });
    setReply('');
    setSending(false);

    // Refresh chat
    const res = await fetch(`/api/requests/${id}/chat`, { headers: { Authorization: `Bearer ${token}` } });
    setChat(await res.json());
  };

  if (!details) return <p className="p-4">جاري التحميل...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto text-right">
      <h1 className="text-2xl font-bold mb-4">تفاصيل الطلب #{id}</h1>

      <div className="mb-6 space-y-2">
        <p><strong>الموضوع:</strong> {details.Title}</p>
        <p><strong>الحالة:</strong> {details.Status}</p>
        <p><strong>تاريخ التقديم:</strong> {new Date(details.RequestDate).toISOString().slice(0, 10)}</p>
        {details.Notes?.includes('.jpg') && (
          <div className="mt-4">
            <strong>الصور المرفقة:</strong>
            <div className="flex gap-4 mt-2 flex-wrap">
              {details.Notes.split(';').map((url: string, i: number) => (
                <img key={i} src={url} className="w-32 border rounded" alt={`img-${i}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-2 mt-8">التسلسل الزمني للطلب:</h2>
      <div className="space-y-2 border-r-4 border-blue-500 pr-4">
        {timeline.map((t, i) => (
          <div key={i} className="bg-gray-100 p-2 rounded shadow-sm">
            <p><strong>{t.ActionType}</strong> - {new Date(t.ActionDate).toLocaleString()}</p>
            <p>{t.ActionText}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-2 mt-8">محادثة الرفض:</h2>
      <div className="bg-white border rounded mb-4 max-h-64 overflow-y-auto p-4 space-y-3">
        {chat.map((c, i) => (
          <div key={i} className={`text-sm ${c.SenderID === details.RequesterID ? 'text-green-700 text-right' : 'text-blue-700 text-left'}`}>
            <p className="font-bold">{c.SenderName}</p>
            <p>{c.Message}</p>
            <p className="text-xs text-gray-500">{new Date(c.SentAt).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <textarea
        placeholder="اكتب ردك هنا..."
        className="w-full p-2 border rounded mb-2"
        rows={3}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />
      <button
        onClick={sendReply}
        disabled={sending || !reply.trim()}
        className="bg-blue-600 text-white py-2 px-4 rounded"
      >
        إرسال الرد
      </button>
    </div>
  );
}
