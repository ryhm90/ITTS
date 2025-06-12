// src/app/admin/employees/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { showToast } from '@/lib/toast';

type UserContext = {
  department: { id: number; name: string };
};

type Employee = {
  SectionEmployeeID: number;
  UserID: number;
  FullName: string;
  Username: string;
  SectionName: string;
  UnitName: string;
  IsActive: boolean;
};

type SectionItem = {
  id: number;
  name: string;
};

type UnitItem = {
  id: number;
  name: string;
};

export default function AdminEmployeesPage() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [userID, setUserID] = useState<number | ''>('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');

  // جلب سياق المستخدم أولاً
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          showToast({ type: 'error', message: data.error });
        } else {
          setCtx(data);
        }
      })
      .catch(() => {
        showToast({ type: 'error', message: 'فشل في جلب سياق المستخدم' });
      });
  }, []);

  // بعد جلب السياق، جلب الموظفين والشعب
  useEffect(() => {
    if (!ctx) return;
    const deptId = ctx.department.id;
    Promise.all([
      fetch('/api/admin/employees', { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/sections?departmentId=${deptId}`, { credentials: 'include' }).then(r => r.json())
    ])
      .then(([empData, secData]) => {
        setEmployees(empData);
        setSections(secData);
      })
      .catch(() => {
        showToast({ type: 'error', message: 'فشل في تحميل البيانات' });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ctx]);

  // عند تغيير الشعبة، جلب الوحدات التابعة لها
  useEffect(() => {
    if (!sectionId) {
      setUnits([]);
      setUnitId('');
      return;
    }
    fetch(`/api/units?sectionId=${sectionId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: UnitItem[]) => setUnits(data))
      .catch(() => {
        showToast({ type: 'error', message: 'فشل في جلب الوحدات' });
      });
  }, [sectionId]);

  // مساعدة لإعادة تحميل قائمة الموظفين
  const reloadEmployees = () => {
    fetch('/api/admin/employees', { credentials: 'include' })
      .then(res => res.json())
      .then(setEmployees)
      .catch(() => showToast({ type: 'error', message: 'فشل في تحديث القائمة' }));
  };

  // إضافة موظف جديد
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!userID || !fullName || !username || !sectionId || !unitId) {
      showToast({ type: 'error', message: 'يرجى تعبئة جميع الحقول' });
      return;
    }
    const sec = sections.find(s => s.id === sectionId)!;
    const unit = units.find(u => u.id === unitId)!;
    const res = await fetch('/api/admin/employees', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        UserID: userID,
        FullName: fullName,
        Username: username,
        SectionId: sectionId,
        SectionName: sec.name,
        UnitId: unitId,
        UnitName: unit.name
      })
    });
    if (res.ok) {
      showToast({ type: 'success', message: 'تمت الإضافة' });
      // إعادة تهيئة الحقول
      setUserID(''); setFullName(''); setUsername(''); setSectionId(''); setUnitId('');
      reloadEmployees();
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'فشل الإضافة' });
    }
  };

  // حذف موظف
  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    const res = await fetch(`/api/admin/employees/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      showToast({ type: 'success', message: 'تم الحذف' });
      reloadEmployees();
    } else {
      showToast({ type: 'error', message: 'فشل الحذف' });
    }
  };

  if (loading) {
    return <div className="p-6 text-center">جاري التحميل...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-right space-y-6">
      <h1 className="text-2xl font-bold">إدارة الموظفين</h1>

      {/* نموذج الإضافة */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4">
        <input
          type="number"
          placeholder="UserID (من جدول Users)"
          value={userID}
          onChange={e => setUserID(+e.target.value || '')}
          className="border p-2 rounded text-right"
        />
        <input
          type="text"
          placeholder="الاسم الكامل"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className="border p-2 rounded text-right"
        />
        <input
          type="text"
          placeholder="اسم المستخدم"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="border p-2 rounded text-right"
        />

        {/* اختيار الشعبة */}
        <select
          value={sectionId}
          onChange={e => setSectionId(+e.target.value || '')}
          className="border p-2 rounded text-right"
        >
          <option value="">— اختر شعبة —</option>
          {sections.map(sec => (
            <option key={sec.id} value={sec.id}>{sec.name}</option>
          ))}
        </select>

        {/* اختيار الوحدة */}
        <select
          value={unitId}
          onChange={e => setUnitId(+e.target.value || '')}
          disabled={!sectionId}
          className="border p-2 rounded text-right disabled:opacity-50"
        >
          <option value="">— اختر وحدة —</option>
          {units.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <button className="bg-green-600 text-white py-2 rounded">
          إضافة موظف
        </button>
      </form>

      {/* جدول العرض */}
      <table className="w-full border text-right">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">#</th>
            <th className="p-2 border">UserID</th>
            <th className="p-2 border">الاسم</th>
            <th className="p-2 border">يوزرنيم</th>
            <th className="p-2 border">الشعبة</th>
            <th className="p-2 border">الوحدة</th>
            <th className="p-2 border">نشط</th>
            <th className="p-2 border">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.SectionEmployeeID} className="hover:bg-gray-50">
              <td className="p-2 border">{emp.SectionEmployeeID}</td>
              <td className="p-2 border">{emp.UserID}</td>
              <td className="p-2 border">{emp.FullName}</td>
              <td className="p-2 border">{emp.Username}</td>
              <td className="p-2 border">{emp.SectionName}</td>
              <td className="p-2 border">{emp.UnitName}</td>
              <td className="p-2 border">{emp.IsActive ? 'نعم' : 'لا'}</td>
              <td className="p-2 border">
                <button
                  onClick={() => handleDelete(emp.SectionEmployeeID)}
                  className="text-red-600 underline"
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
