'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GroupSettingsPage() {
  const { groupId } = useParams();
  const router = useRouter();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    const fetchGroupData = async () => {
      const res = await fetch(`/api/chat/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroupName(data.group.GroupName);
        setDescription(data.group.Description || '');
        if (data.group.GroupImage) {
          setImagePreview(data.group.GroupImage);
        }
      }
    };
    fetchGroupData();
  }, [groupId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSizeMB = 2;
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`الحد الأقصى لحجم الصورة هو ${maxSizeMB} ميجابايت.`);
        e.target.value = ''; // إعادة تعيين الاختيار
        setImageFile(null);
        setImagePreview('');
        return;
      }

      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleUpdate = async () => {
    const formData = new FormData();
    formData.append('groupName', groupName);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const res = await fetch(`/api/chat/groups/${groupId}/update`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      alert('تم تحديث معلومات المجموعة بنجاح!');
      router.push(`/chat/group/${groupId}`);
    } else {
      alert('حدث خطأ أثناء التحديث.');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto text-right">
      <h1 className="text-2xl font-bold mb-6">تعديل إعدادات المجموعة</h1>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">اسم المجموعة</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">وصف المجموعة</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded p-2 h-24"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">صورة المجموعة</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full"
        />
      </div>

      {/* ✅ معاينة الصورة المختارة */}
      {imagePreview && (
        <div className="mb-6">
          <p className="font-semibold mb-2">معاينة الصورة:</p>
          <img
            src={imagePreview}
            alt="معاينة الصورة"
            className="w-32 h-32 object-cover rounded shadow mx-auto"
          />
        </div>
      )}

      <button
        onClick={handleUpdate}
        className="bg-blue-600 text-white w-full py-2 rounded"
      >
        حفظ التعديلات
      </button>
    </div>
  );
}
