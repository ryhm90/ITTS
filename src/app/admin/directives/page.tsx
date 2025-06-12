'use client';

import { useEffect, useState } from 'react';

export default function DirectivesPage() {
  const [directives, setDirectives] = useState([]);

  useEffect(() => {
    const fetchDirectives = async () => {
      const res = await fetch('/api/admin/directives');
      if (res.ok) {
        setDirectives(await res.json());
      }
    };
    fetchDirectives();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto text-right">
      <h1 className="text-3xl font-bold mb-6">التوجيهات الصادرة</h1>

      <table className="w-full border text-right">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">رقم التوجيه</th>
            <th className="p-2 border">رقم الطلب</th>
            <th className="p-2 border">نص التوجيه</th>
            <th className="p-2 border">تاريخ الإرسال</th>
          </tr>
        </thead>
        <tbody>
          {directives.map((dir: any) => (
            <tr key={dir.DirectiveID}>
              <td className="p-2 border">{dir.DirectiveID}</td>
              <td className="p-2 border">{dir.RequestID}</td>
              <td className="p-2 border">{dir.DirectiveText}</td>
              <td className="p-2 border">{new Date(dir.CreatedAt).toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
