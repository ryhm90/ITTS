'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';

type DevcType = { id: number; name: string };
type Device   = {
  id: number;
  noDv: number;
  caseDesc: string;
  descriptionName: string;
};

type UserContext = {
  id: number;
  name: string;
  role: string;
  division:   { id: number; name: string };
  department: { id: number; name: string };
  section:    { id: number; name: string };
};

export default function NewRequestPage() {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [types, setTypes]               = useState<DevcType[]>([]);
  const [selectedType, setSelectedType] = useState<number | ''>('');

  const [devices, setDevices]           = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [images, setImages]             = useState<File[]>([]);
  const [uploading, setUploading]       = useState(false);

  const router = useRouter();

  // 1. جلب سياق المستخدم
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          showToast({ type: 'error', message: data.error });
          router.push('/login');
        } else {
          setCtx(data);
        }
      })
      .catch(() => {
        showToast({ type: 'error', message: 'خطأ في المصادقة' });
        router.push('/login');
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, [router]);

  // 2. جلب أنواع الأجهزة
  useEffect(() => {
    fetch('/api/devctypes')
      .then(res => res.json())
      .then(setTypes)
      .catch(() => showToast({ type: 'error', message: 'فشل في جلب أنواع الأجهزة' }));
  }, []);

  // 3. جلب الأجهزة عند اختيار النوع
  useEffect(() => {
    if (!selectedType || !ctx) {
      setDevices([]);
      return;
    }
    const { division, department, section } = ctx;
    const params = new URLSearchParams({
      typeId:        selectedType.toString(),
      divisionId:    division.id.toString(),
      departmentId:  department.id.toString(),
      sectionId:     section.id.toString(),
    });
    fetch(`/api/devices?${params}`, { credentials: 'include' })
      .then(res => res.json())
      .then(setDevices)
      .catch(() => showToast({ type: 'error', message: 'فشل في جلب الأجهزة' }));
  }, [selectedType, ctx]);

  // 4. رفع الصور
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    setImages(Array.from(files));
  };

  // 5. إرسال الطلب
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ctx) return;
    if (!title || !description || !selectedType || selectedDevice == null) {
      showToast({ type: 'error', message: 'يرجى تعبئة جميع الحقول واختيار جهاز' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('deviceId', selectedDevice.toString());
    images.forEach(img => formData.append('images', img));

    const res = await fetch('/api/requests', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    setUploading(false);

    if (res.ok) {
      showToast({ type: 'success', message: 'تم إرسال الطلب بنجاح' });
      router.push('/dashboard');
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'حدث خطأ أثناء الإرسال' });
    }
  };

  // 6. منع الرندر حتى انتهاء المصادقة
  if (!authChecked) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-right">تقديم طلب جديد</h1>
      <form onSubmit={handleSubmit}>
        {/* الموضوع */}
        <input
          type="text"
          placeholder="الموضوع"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full mb-4 p-2 border rounded text-right"
        />

        {/* التفاصيل */}
        <textarea
          placeholder="تفاصيل الطلب"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full mb-4 p-2 border rounded h-32 text-right"
        />

        {/* نوع الجهاز */}
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value ? +e.target.value : '')}
          className="w-full mb-4 p-2 border rounded text-right"
        >
          <option value="">— اختر نوع الجهاز —</option>
          {types.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* جدول الأجهزة مع عمود الوصف الإضافي */}
        {devices.length > 0 && (
          <div className="mb-4 text-right">
            <p className="font-semibold mb-2">الجهاز المتوفر:</p>
            <table className="w-full border mb-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1">اختيار</th>
                  <th className="border p-1">رقم الجهاز</th>
                  <th className="border p-1">الحالة</th>
                  <th className="border p-1">الوصف الإضافي</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id}>
                    <td className="border p-1 text-center">
                      <input
                        type="radio"
                        name="device"
                        value={d.id}
                        checked={selectedDevice === d.id}
                        onChange={() => setSelectedDevice(d.id)}
                      />
                    </td>
                    <td className="border p-1">{d.noDv}</td>
                    <td className="border p-1">{d.caseDesc}</td>
                    <td className="border p-1">{d.descriptionName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* رفع الصور */}
        <input
          type="file"
          multiple
          onChange={e => handleImageUpload(e.target.files)}
          className="mb-4"
        />
        {images.length > 0 && (
          <div className="mb-4 text-right">
            <p className="mb-2 font-semibold">الصور المختارة:</p>
            <ul className="list-disc pr-5">
              {images.map((img, i) => <li key={i}>{img.name}</li>)}
            </ul>
          </div>
        )}

        {/* زر الإرسال */}
        <button
          type="submit"
          disabled={uploading}
          className="bg-green-600 text-white py-2 px-4 rounded w-full"
        >
          {uploading ? 'جاري الإرسال...' : 'إرسال الطلب'}
        </button>
      </form>
    </div>
  );
}
