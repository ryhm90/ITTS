// src/components/NewRequestForm.tsx
'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
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

interface NewRequestFormProps {
  onSuccess: () => void;
}

export default function NewRequestForm({ onSuccess }: NewRequestFormProps) {
  const [ctx, setCtx]                   = useState<UserContext | null>(null);
  const [authChecked, setAuthChecked]   = useState(false);
  const [types, setTypes]               = useState<DevcType[]>([]);
  const [selectedType, setSelectedType] = useState<number | ''>('');
  const [devices, setDevices]           = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [images, setImages]             = useState<File[]>([]);
  const [uploading, setUploading]       = useState(false);
  const router = useRouter();

  // 1) جلب سياق المستخدم
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
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
      .finally(() => setAuthChecked(true));
  }, [router]);

  // 2) جلب أنواع الأجهزة
  useEffect(() => {
    fetch('/api/devctypes')
      .then(r => r.json())
      .then(setTypes)
      .catch(() => showToast({ type: 'error', message: 'فشل في جلب أنواع الأجهزة' }));
  }, []);

  // 3) جلب الأجهزة عند اختيار النوع
  useEffect(() => {
    if (!selectedType || !ctx) {
      setDevices([]);
      return;
    }
    const { division, department, section } = ctx;
    const params = new URLSearchParams({
      typeId:       selectedType.toString(),
      divisionId:   division.id.toString(),
      departmentId: department.id.toString(),
      sectionId:    section.id.toString(),
    });
    fetch(`/api/devices?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setDevices)
      .catch(() => showToast({ type: 'error', message: 'فشل في جلب الأجهزة' }));
  }, [selectedType, ctx]);

  // رفع الصور
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    setImages(Array.from(files));
  };

  // إرسال الطلب
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ctx || !title || !description || !selectedType || selectedDevice == null) {
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
      onSuccess();  // إعادة فتح لوحة التحكم أو إغلاق الـDialog
    } else {
      const err = await res.json();
      showToast({ type: 'error', message: err.error || 'حدث خطأ أثناء الإرسال' });
    }
  };

  if (!authChecked) return null;

  return (
    <Box component="form" onSubmit={handleSubmit} dir="rtl">
      <Typography variant="h6" mb={2}>تقديم طلب جديد</Typography>
      <TextField
        label="الموضوع"
        fullWidth
        margin="normal"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <TextField
        label="تفاصيل الطلب"
        fullWidth
        multiline
        rows={4}
        margin="normal"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>نوع الجهاز</InputLabel>
        <Select
          value={selectedType}
          label="نوع الجهاز"
          onChange={e => setSelectedType(Number(e.target.value))}
        >
          {types.map(t => (
            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {devices.length > 0 && (
        <TableContainer component={Paper} sx={{ my: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center">اختيار</TableCell>
                <TableCell>رقم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>وصف إضافي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map(d => (
                <TableRow key={d.id}>
                  <TableCell align="center">
                    <Radio
                      checked={selectedDevice === d.id}
                      onChange={() => setSelectedDevice(d.id)}
                    />
                  </TableCell>
                  <TableCell>{d.noDv}</TableCell>
                  <TableCell>{d.caseDesc}</TableCell>
                  <TableCell>{d.descriptionName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Button
        variant="contained"
        component="label"
        sx={{ mb: 2 }}
        fullWidth
      >
        رفع صور
        <input type="file" hidden multiple onChange={e => handleImageUpload(e.target.files)} />
      </Button>
      <Box textAlign="center">
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={uploading}
        >
          {uploading ? 'جاري الإرسال…' : 'إرسال الطلب'}
        </Button>
      </Box>
    </Box>
  );
}
