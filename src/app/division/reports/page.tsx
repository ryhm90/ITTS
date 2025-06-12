'use client';

import { useEffect, useState } from 'react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils'; // ✅ الآن يمكنك الاستيراد

export default function DivisionReportsPage() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      const res = await fetch('/api/division/reports');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto text-right">
      <h1 className="text-3xl font-bold mb-6">تقارير الشعبة</h1>

      {/* ✅ أزرار التصدير هنا */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => exportToExcel(requests, 'Division_Report')} className="bg-green-600 text-white py-2 px-4 rounded">
          تصدير Excel
        </button>
        <button onClick={() => exportToPDF(requests, 'تقرير الشعبة')} className="bg-red-600 text-white py-2 px-4 rounded">
          تصدير PDF
        </button>
      </div>

      {/* جدول عرض الطلبات */}
      <table className="w-full border text-right">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">رقم الطلب</th>
            <th className="p-2 border">الموضوع</th>
            <th className="p-2 border">الحالة</th>
            <th className="p-2 border">تاريخ الطلب</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req: any) => (
            <tr key={req.RequestID}>
              <td className="p-2 border">{req.RequestID}</td>
              <td className="p-2 border">{req.Title}</td>
              <td className="p-2 border">{req.Status}</td>
              <td className="p-2 border">{new Date(req.RequestDate).toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
