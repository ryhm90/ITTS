'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Typography,
  CircularProgress,
  Autocomplete
} from '@mui/material';

interface Option { id: number; name: string; }

export default function AddDevicePage() {
  const router = useRouter();

  // حقول النموذج
  const [typeId, setTypeId] = useState<number | ''>('');
  const [noDv, setNoDv] = useState<number | ''>('');
  const [descriptionOptions, setDescriptionOptions] = useState<Option[]>([]);
  const [descriptionName, setDescriptionName] = useState<string>('');
  const [caseStatus, setCaseStatus] = useState<'يعمل بشكل جيد' | 'عاطل' | ''>('');

  const [divisionId, setDivisionId] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [sectionId, setSectionId] = useState<number | ''>('');

  // مواصفات الحاسوب
  const cpuOptions  = ['i3','i5','i7','i9'];
  const ramOptions  = ['2G','4G','6G','8G','10G','12G','16G'];
  const hardOptions = ['128G','256G','500G','1T','2T','4T'];
  const gpuOptions  = ['2G','4G','8G','12G'];

  const [cpu, setCpu]     = useState<string>('');
  const [ram, setRam]     = useState<string>('');
  const [hard, setHard]   = useState<string>('');
  const [vga, setVga]     = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // قوائم
  const [types, setTypes]         = useState<Option[]>([]);
  const [divisions, setDivisions] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [sections, setSections]   = useState<Option[]>([]);

  // UI state
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar]   = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [excelFile, setExcelFile]     = useState<File | null>(null);
  const [importing, setImporting]     = useState(false);

  // 1) جلب أنواع الأجهزة والتشكيلات
  useEffect(() => {
    Promise.all([
      fetch('/api/devctypes',{ credentials:'include' }),
      fetch('/api/divisions',{ credentials:'include' })
    ])
    .then(async ([tRes, dRes]) => {
      if (!tRes.ok || !dRes.ok) throw new Error();
      setTypes(await tRes.json());
      setDivisions(await dRes.json());
    })
    .catch(() => setSnackbar({ message: 'فشل في جلب البيانات الابتدائية', severity: 'error' }))
    .finally(() => setLoading(false));
  }, []);

  // 2) Autocomplete لأسماء الأوصاف بناءً على النوع
  useEffect(() => {
    if (!typeId) {
      setDescriptionOptions([]);
      setDescriptionName('');
      return;
    }
    fetch(`/api/device-descriptions?type_dv=${typeId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setDescriptionOptions)
      .catch(() => {}); // صامت
    // عندما يتغير النوع، أفرغ مواصفات الحاسوب
    setCpu(''); setRam(''); setHard(''); setVga(''); setNotes('');
  }, [typeId]);

  // 3) العلاقات الهرمية (division→department→section)
  useEffect(() => {
    if (!divisionId) {
      setDepartments([]); setDepartmentId('');
      return;
    }
    fetch(`/api/departments?divisionId=${divisionId}`,{ credentials:'include' })
      .then(r=>r.ok?r.json():Promise.reject())
      .then(setDepartments)
      .catch(()=>setSnackbar({ message:'فشل في جلب الأقسام', severity:'error'}));
    setDepartmentId(''); setSections([]); setSectionId('');
  }, [divisionId]);

  useEffect(() => {
    if (!departmentId) {
      setSections([]); setSectionId('');
      return;
    }
    fetch(`/api/sections?departmentId=${departmentId}`,{ credentials:'include' })
      .then(r=>r.ok?r.json():Promise.reject())
      .then(setSections)
      .catch(()=>setSnackbar({ message:'فشل في جلب الشعب', severity:'error'}));
    setSectionId('');
  }, [departmentId]);

  // متغير يدل إن كان النوع "حاسبة"
  const isComputer = types.find(t => t.id === typeId)?.name === 'حاسبة';
// رفع ملف إكسل
  const handleExcelChange = (e: ChangeEvent<HTMLInputElement>) => {
    setExcelFile(e.target.files?.[0] ?? null);
  };

  const handleImport = async () => {
    if (!excelFile) {
      setSnackbar({ message: 'اختر ملف Excel أولاً', severity:'error' });
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', excelFile);
      const res = await fetch('/api/admin/devices/import', {
        method: 'POST',
        body: form,
        credentials: 'include'
      });
      if (!res.ok) throw await res.json();
      setSnackbar({ message: 'تم استيراد الأجهزة من الإكسل بنجاح', severity:'success' });
      // بعد الاستيراد يمكنك إعادة تحميل الصفحة أو تفريغ حقول الإدخال:
      setExcelFile(null);
    } catch (err: any) {
      setSnackbar({ message: err.error || 'فشل استيراد الأجهزة', severity:'error' });
    } finally {
      setImporting(false);
    }
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // تحقق من الحقول الأساسية
    if (
      !typeId ||
      !noDv ||
      !descriptionName.trim() ||
      !caseStatus ||
      !divisionId ||
      !departmentId ||
      !sectionId
    ) {
      setSnackbar({ message: 'يرجى تعبئة جميع الحقول', severity: 'error' });
      return;
    }
    // تحقق من مواصفات الحاسوب إن كان النوع حاسبة
    if (isComputer && (!cpu||!ram||!hard||!vga)) {
      setSnackbar({ message: 'يرجى اختيار مواصفات الحاسوب كاملة', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/admin/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          typeId,
          noDv,
          descriptionName,
          caseStatus,
          divisionId,
          departmentId,
          sectionId,
          ...(isComputer ? { cpu, ram, hard, vga, notes } : {})
        })
      }).then(res => {
        if (!res.ok) throw new Error();
      });
      setSnackbar({ message: 'تم إضافة الجهاز بنجاح', severity: 'success' });
    } catch {
      setSnackbar({ message: 'فشل إضافة الجهاز', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      maxWidth={600}
      mx="auto"
      mt={4}
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="h5">إضافة جهاز جديد</Typography>
{/* — استيراد من Excel — */}
      <Box sx={{ display:'flex', gap:1, alignItems:'center' }}>
        <Button variant="outlined" component="label" disabled={importing}>
          {importing ? 'جارٍ الاستيراد…' : 'استيراد من Excel'}
          <input hidden type="file" accept=".xlsx,.xls" onChange={handleExcelChange}/>
        </Button>
        <Button variant="contained" onClick={handleImport} disabled={!excelFile || importing}>
          استيراد
        </Button>
        {excelFile && <Typography>{excelFile.name}</Typography>}
      </Box>
      {/* اختيار نوع الجهاز */}
      <FormControl fullWidth>
        <InputLabel>نوع الجهاز</InputLabel>
        <Select
          value={typeId}
          label="نوع الجهاز"
          onChange={e => setTypeId(Number(e.target.value))}
        >
          <MenuItem value=""><em>— اختر النوع —</em></MenuItem>
          {types.map(t => (
            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Autocomplete لاسم الجهاز */}
      <Autocomplete
        freeSolo
        options={descriptionOptions.map(o => o.name)}
        value={descriptionName}
        onChange={(_, v) => setDescriptionName(v ?? '')}
        onInputChange={(_, v) => setDescriptionName(v)}
        renderInput={params => (
          <TextField {...params} label="اسم الجهاز" required />
        )}
      />

      {/* مواصفات الحاسوب إن كان النوع "حاسبة" */}
      {isComputer && (
        <>
          <FormControl fullWidth>
            <InputLabel>CPU</InputLabel>
            <Select value={cpu} label="CPU" onChange={e => setCpu(e.target.value)}>
              <MenuItem value=""><em>— اختر CPU —</em></MenuItem>
              {cpuOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>RAM</InputLabel>
            <Select value={ram} label="RAM" onChange={e => setRam(e.target.value)}>
              <MenuItem value=""><em>— اختر RAM —</em></MenuItem>
              {ramOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>HDD/SSD</InputLabel>
            <Select value={hard} label="HDD/SSD" onChange={e => setHard(e.target.value)}>
              <MenuItem value=""><em>— اختر الحجم —</em></MenuItem>
              {hardOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>GPU</InputLabel>
            <Select value={vga} label="GPU" onChange={e => setVga(e.target.value)}>
              <MenuItem value=""><em>— اختر GPU —</em></MenuItem>
              {gpuOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="ملاحظات إضافية"
            fullWidth
            multiline
            minRows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </>
      )}

      {/* رقم الجهاز */}
      <TextField
        label="رقم الجهاز"
        type="number"
        fullWidth
        value={noDv}
        onChange={e => setNoDv(Number(e.target.value))}
      />

      {/* حالة الجهاز */}
      <FormControl fullWidth>
        <InputLabel>حالة الجهاز</InputLabel>
        <Select
          value={caseStatus}
          label="حالة الجهاز"
          onChange={e => setCaseStatus(e.target.value as 'يعمل بشكل جيد' | 'عاطل')}
        >
          <MenuItem value=""><em>— اختر الحالة —</em></MenuItem>
          <MenuItem value="يعمل بشكل جيد">يعمل بشكل جيد</MenuItem>
          <MenuItem value="عاطل">عاطل</MenuItem>
        </Select>
      </FormControl>

      {/* التقسيم الهرمي */}
      <FormControl fullWidth>
        <InputLabel>التشكيل</InputLabel>
        <Select
          value={divisionId}
          label="التشكيل"
          onChange={e => setDivisionId(Number(e.target.value))}
        >
          <MenuItem value=""><em>— اختر التشكيل —</em></MenuItem>
          {divisions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth disabled={!departments.length}>
        <InputLabel>القسم</InputLabel>
        <Select
          value={departmentId}
          label="القسم"
          onChange={e => setDepartmentId(Number(e.target.value))}
        >
          <MenuItem value=""><em>— اختر القسم —</em></MenuItem>
          {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth disabled={!sections.length}>
        <InputLabel>الشعبة</InputLabel>
        <Select
          value={sectionId}
          label="الشعبة"
          onChange={e => setSectionId(Number(e.target.value))}
        >
          <MenuItem value=""><em>— اختر الشعبة —</em></MenuItem>
          {sections.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </Select>
      </FormControl>

      <Box display="flex" justifyContent="flex-end">
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'جاري الإضافة…' : 'أضف الجهاز'}
        </Button>
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical:'top', horizontal:'center' }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
