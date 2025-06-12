'use client';

import { useEffect, useState } from 'react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils'; // سنبنيه بعد قليل

export default function ReportsPage() {
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [department, setDepartment] = useState('');
  const [employee, setEmployee] = useState('');
  const [requests, setRequests] = useState([]);
  
  const [subject, setSubject] = useState('');
  const [beneficiaryRequests, setBeneficiaryRequests] = useState([]);

  const handleSearch = async () => {
    const query = new URLSearchParams({
      status,
      fromDate,
      toDate,
      department,
      employee,
    }).toString();

    const res = await fetch(`/api/admin/reports/tasks?${query}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data);
    }
  };

  const handleBeneficiarySearch = async () => {
    const query = new URLSearchParams({ subject }).toString();
    const res = await fetch(`/api/admin/reports/beneficiary?${query}`);
    if (res.ok) {
      const data = await res.json();
      setBeneficiaryRequests(data);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-right">
      <h1 className="text-3xl font-bold mb-6">التقارير</h1>

      {/* تقرير عام */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">تقرير عام للمهام</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="p-2 border rounded">
            <option value="">كل الحالات</option>
            <option value="قيد الإستلام">قيد الإستلام</option>
            <option value="استلم">استلم</option>
            <option value="قيد التنفيذ">قيد التنفيذ</option>
            <option value="مكتمل">مكتمل</option>
            <option value="مرفوض">مرفوض</option>
          </select>

          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 border rounded" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border rounded" />
          <input type="text" placeholder="اسم الشعبة" value={department} onChange={(e) => setDepartment(e.target.value)} className="p-2 border rounded" />
          <input type="text" placeholder="اسم الموظف" value={employee} onChange={(e) => setEmployee(e.target.value)} className="p-2 border rounded" />
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={handleSearch} className="bg-blue-600 text-white py-2 px-4 rounded">
            بحث
          </button>
          <button onClick={() => exportToExcel(requests, 'General_Report')} className="bg-green-600 text-white py-2 px-4 rounded">
            تصدير Excel
          </button>
          <button onClick={() => exportToPDF(requests, 'تقرير عام للمهام')} className="bg-red-600 text-white py-2 px-4 rounded">
            تصدير PDF
          </button>
        </div>

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
      </section>

      {/* تقرير طلبات جهة مستفيدة */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">تقرير طلبات الجهة المستفيدة</h2>

        <div className="flex gap-4 mb-6">
          <input type="text" placeholder="ابحث بالموضوع..." value={subject} onChange={(e) => setSubject(e.target.value)} className="p-2 border rounded w-1/2" />
          <button onClick={handleBeneficiarySearch} className="bg-blue-600 text-white py-2 px-4 rounded">
            بحث
          </button>
        </div>

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
            {beneficiaryRequests.map((req: any) => (
              <tr key={req.RequestID}>
                <td className="p-2 border">{req.RequestID}</td>
                <td className="p-2 border">{req.Title}</td>
                <td className="p-2 border">{req.Status}</td>
                <td className="p-2 border">{new Date(req.RequestDate).toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
