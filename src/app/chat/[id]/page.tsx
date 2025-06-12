'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { showToast } from '@/lib/toast';

export default function ChatPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/chat/${id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        } else {
          showToast({ type: 'error', message: 'فشل في تحميل الرسائل' });
        }
      } catch (err) {
        console.error(err);
        showToast({ type: 'error', message: 'خطأ في الشبكة' });
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchMessages();
  }, [id]);

  async function sendMessage() {
    if (!text.trim()) return;

    const res = await fetch(`/api/chat/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ messageText: text }),
    });

    if (res.ok) {
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      setText('');
    } else {
      showToast({ type: 'error', message: 'فشل إرسال الرسالة' });
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-right">
      <h1 className="text-xl font-bold mb-4">محادثة</h1>

      <div className="bg-gray-50 p-4 rounded h-96 overflow-y-auto mb-4 border">
        {loading ? (
          <p>جاري التحميل...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.MessageID} className="mb-2">
              <p className="font-semibold">{msg.FromUserID === Number(id) ? 'المرسل' : 'أنت'}:</p>
              <p className="text-gray-700">{msg.MessageText}</p>
              {msg.ImageUrl && <img src={msg.ImageUrl} alt="مرفق" className="w-40 mt-2" />}
              <p className="text-xs text-gray-400">{new Date(msg.SentAt).toLocaleString()}</p>
              <hr className="my-2" />
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="اكتب رسالة..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 border p-2 rounded"
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded">
          إرسال
        </button>
      </div>
    </div>
  );
}
