'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { showToast } from '@/lib/toast';

type HistoryItem = {
  ActionType:  string;
  ActionNote?: string;
  ActionBy:    string;
  ActionDate:  string;
};

type Employee = { SectionEmployeeID: number; FullName: string };

type RequestDetail = {
  RequestID:       number;
  Title:           string;
  Description:     string;
  Status:          string;
  RequestDate:     string;
  deviceId:        number;
  divisionName:    string;
  departmentName:  string;
  sectionName:     string;
  deviceType:      string;
  deviceNo:        number;
  deviceDesc?:     string;
};

type DeviceRequest = {
  RequestID:   number;
  Title:       string;
  Status:      string;
  RequestDate: string;
};

export default function DivisionRequestDetails() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [request, setRequest]               = useState<RequestDetail | null>(null);
  const [history, setHistory]               = useState<HistoryItem[]>([]);
  const [employees, setEmployees]           = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp]       = useState<number | ''>('');
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequest[]>([]);
  const [comment, setComment]               = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [loading, setLoading]               = useState(true);

  // جلب كل البيانات دفعة واحدة
  useEffect(() => {
    async function loadAll() {
      try {
        const [reqRes, histRes, empRes] = await Promise.all([
          fetch(`/api/division/requests/${id}`,       { credentials: 'include' }),
          fetch(`/api/admin/requests/${id}/history`,  { credentials: 'include' }),
          fetch(`/api/division/employees`,            { credentials: 'include' }),
        ]);

        if (reqRes.ok) {
          const rd: RequestDetail = await reqRes.json();
          setRequest(rd);
          // جلب الطلبات الخاصة بنفس الجهاز
          fetch(`/api/division/requests?deviceId=${rd.deviceId}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(setDeviceRequests)
            .catch(() => {});
        }
        if (histRes.ok) {
          setHistory(await histRes.json());
        }
        if (empRes.ok) {
          setEmployees(await empRes.json());
        }
      } catch {
        showToast({ type: 'error', message: 'خطأ في تحميل البيانات' });
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [id]);

  // إرسال التعيين
  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmp) {
      showToast({ type: 'error', message: 'اختر موظفاً' });
      return;
    }
    const res = await fetch(`/api/division/requests/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      credentials: 'include',
      body: JSON.stringify({ employeeId: selectedEmp })
    });
    if (res.ok) {
      showToast({ type: 'success', message: 'تم التعيين' });
      router.push('/division/requests');
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'فشل التعيين' });
    }
  }

  // إرسال تأكيد الإنجاز
  async function handleComplete() {
    if (!confirm('هل أنت متأكد من تأكيد إنجاز هذا الطلب؟')) return;
    const res = await fetch(`/api/division/requests/${id}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      showToast({ type: 'success', message: 'تم تأكيد إنجاز الطلب' });
      router.push('/division/requests');
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'فشل تأكيد الإنجاز' });
    }
  }

  // إرسال التعليق
  async function handleComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) {
      showToast({ type: 'error', message: 'اكتب تعليقاً أولاً' });
      return;
    }
    setSendingComment(true);
    const res = await fetch(`/api/division/requests/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      credentials: 'include',
      body: JSON.stringify({ comment })
    });
    if (res.ok) {
      // إعادة تحميل السجل
      fetch(`/api/admin/requests/${id}/history`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(setHistory)
        .catch(() => {});
      setComment('');
      showToast({ type: 'success', message: 'تم إضافة التعليق' });
      await fetch(`/api/admin/requests/${id}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تعليق',
        }),
      });
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'فشل إضافة التعليق' });
    }
    setSendingComment(false);
  }

  if (loading) {
    return <div className="text-center p-10">جاري التحميل...</div>;
  }
  if (!request) {
    return <div className="p-6 text-red-600">تعذّر تحميل تفاصيل الطلب.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto text-right space-y-8">

      {/* تفاصيل الطلب */}
      <div className="bg-white shadow p-4 rounded space-y-2">
        <h1 className="text-2xl font-bold">تفاصيل الطلب #{request.RequestID}</h1>
        <p><strong>الموضوع:</strong> {request.Title}</p>
        <p><strong>الوصف:</strong> {request.Description}</p>
        <p><strong>تاريخ التقديم:</strong> {new Date(request.RequestDate).toISOString().slice(0, 10)}</p>
        <p><strong>الحالة:</strong> {request.Status}</p>

        {/* الهيكل الهرمي */}
        <p>
          <strong>الهيكل الهرمي:</strong> <br/>
          {request.divisionName} &gt; {request.departmentName} &gt; {request.sectionName}
        </p>

        {/* معلومات الجهاز */}
        <p>
          <strong>الجهاز:</strong> <br/>
          {request.deviceType} #{request.deviceNo}
          {request.deviceDesc && <> ({request.deviceDesc})</>}
        </p>

        <button
          onClick={handleComplete}
          className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          تأكيد إنجاز
        </button>
      </div>

      {/* جدول الطلبات بنفس الجهاز */}
      {deviceRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">طلبات بنفس الجهاز</h2>
          <table className="w-full border text-right mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">رقم الطلب</th>
                <th className="p-2 border">الموضوع</th>
                <th className="p-2 border">الحالة</th>
                <th className="p-2 border">التاريخ</th>
                <th className="p-2 border">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {deviceRequests.map(dr => (
                <tr key={dr.RequestID} className="hover:bg-gray-50">
                  <td className="p-2 border">{dr.RequestID}</td>
                  <td className="p-2 border">{dr.Title}</td>
                  <td className="p-2 border">{dr.Status}</td>
                  <td className="p-2 border">{new Date(dr.RequestDate).toISOString().slice(0, 10)}</td>
                  <td className="p-2 border">
                    <Link href={`/division/requests/${dr.RequestID}`}>
                      <button className="text-blue-600 underline">مشاهدة</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* سجل العمليات */}
      <div>
        <h2 className="text-xl font-bold mb-2">سجل العمليات</h2>
        <div className="relative border-l-2 border-gray-300 pl-4 space-y-6">
          {history.map((h, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[6px] top-1 w-3 h-3 bg-blue-600 rounded-full"></div>
              <div className={`p-4 rounded ${h.ActionType === 'تعليق' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                <p className="font-bold">{h.ActionType}</p>
                {h.ActionNote && <p className="mt-1 text-gray-700">{h.ActionNote}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  بواسطة {h.ActionBy} في {new Date(h.ActionDate).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* نموذج إضافة تعليق */}
      <form onSubmit={handleComment} className="bg-white shadow p-6 rounded">
        <h2 className="text-xl font-bold mb-4">إضافة تعليق</h2>
        <textarea
          className="w-full mb-4 p-2 border rounded h-24 text-right"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="اكتب تعليقك هنا..."
        />
        <button
          type="submit"
          disabled={sendingComment}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {sendingComment ? 'جاري الإرسال...' : 'إرسال التعليق'}
        </button>
      </form>

      {/* نموذج التعيين */}
      <form onSubmit={handleAssign} className="bg-white shadow p-6 rounded">
        <h2 className="text-xl font-bold mb-4">تعيين موظف لتنفيذ الطلب</h2>
        <select
          className="w-full mb-4 p-2 border rounded text-right"
          value={selectedEmp}
          onChange={e => setSelectedEmp(e.target.value ? +e.target.value : '')}
        >
          <option value="">— اختر موظف —</option>
          {employees.map(emp => (
            <option key={emp.SectionEmployeeID} value={emp.SectionEmployeeID}>
              {emp.FullName}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          تعيين
        </button>
      </form>

    </div>
  );
}
