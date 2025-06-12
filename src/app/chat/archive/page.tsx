'use client';

import { useEffect, useState } from 'react';

export default function ChatArchivePage() {
  const [archives, setArchives] = useState([]);

  useEffect(() => {
    const fetchArchives = async () => {
      const res = await fetch('/api/chat/archive');
      if (res.ok) {
        const data = await res.json();
        setArchives(data);
      }
    };

    fetchArchives();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto text-right">
      <h1 className="text-2xl font-bold mb-6">أرشيف المحادثات</h1>

      <table className="w-full border text-right">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">الموضوع</th>
            <th className="p-2 border">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {archives.map((msg: any) => (
            <tr key={msg.MessageID}>
              <td className="p-2 border">{msg.MessageText}</td>
              <td className="p-2 border">{new Date(msg.SentAt).toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
