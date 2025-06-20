'use client';
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { PageContainer, PrimaryButton } from '@/components/StyledComponents';

type Division   = { id: number; name: string };
type Department = { id: number; name: string };
type Section    = { id: number; name: string };
type Unit       = { id: number; name: string };

export default function SignupPage() {
  const [fullName, setFullName]     = useState('');
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [role,     setRole]         = useState('');

  const [divisions,   setDivisions]   = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections,    setSections]    = useState<Section[]>([]);
  const [units,       setUnits]       = useState<Unit[]>([]);

  const [division,   setDivision]   = useState<number | ''>('');
  const [department, setDepartment] = useState<number | ''>('');
  const [section,    setSection]    = useState<number | ''>('');
  const [unit,       setUnit]       = useState<number | ''>('');

  const router = useRouter();

  // جلب البيانات
  useEffect(() => {
    fetch('/api/divisions').then(r => r.json()).then(setDivisions);
  }, []);
  useEffect(() => {
    if (!division) return setDepartments([]);
    fetch(`/api/departments?divisionId=${division}`)
      .then(r => r.json())
      .then(setDepartments);
  }, [division]);
  useEffect(() => {
    if (!department) return setSections([]);
    fetch(`/api/sections?departmentId=${department}`)
      .then(r => r.json())
      .then(setSections);
  }, [department]);
  useEffect(() => {
    if (!section) return setUnits([]);
    fetch(`/api/units?sectionId=${section}`)
      .then(r => r.json())
      .then(setUnits);
  }, [section]);

  // إرسال
  const handleRegister = async () => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        username,
        password,
        role,

        division:    divisions.find(d => d.id === division)?.name   || '',
        divisionId:  division,

        department:  departments.find(d => d.id === department)?.name || '',
        departmentId: department,

        section:     sections.find(s => s.id === section)?.name    || '',
        sectionId:   section,

        unit:        units.find(u => u.id === unit)?.name    || '',
        unitId:      unit,
      }),
    });

    if (res.ok) {
      //router.push('/login');
    } else {
      const { error } = await res.json();
      alert(error || 'فشل في التسجيل');
    }
  };

  return (
    <PageContainer>
      <Box
        component="form"
        sx={{
          maxWidth: 400,
          mx: 'auto',
          my: 8,
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Typography variant="h5" align="center">
          تسجيل مستخدم جديد
        </Typography>

        <TextField
          label="الاسم الكامل"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          fullWidth
        />

        <TextField
          label="اسم المستخدم"
          value={username}
          onChange={e => setUsername(e.target.value)}
          fullWidth
        />

        <TextField
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel>الدور</InputLabel>
          <Select
            value={role}
            label="الدور"
            onChange={e => setRole(e.target.value)}
          >
            <MenuItem value=""><em>— اختر الدور —</em></MenuItem>
            <MenuItem value="جهة مستفيدة">جهة مستفيدة</MenuItem>
            <MenuItem value="مدير قسم">مدير قسم</MenuItem>
            <MenuItem value="مدير شعبة">مدير شعبة</MenuItem>
            <MenuItem value="مسؤول وحدة">مسؤول وحدة</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>التشكيل</InputLabel>
          <Select
            value={division}
            label="التشكيل"
            onChange={e => setDivision(+e.target.value)}
          >
            <MenuItem value=""><em>— اختر التشكيل —</em></MenuItem>
            {divisions.map(d => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth disabled={!division}>
          <InputLabel>القسم</InputLabel>
          <Select
            value={department}
            label="القسم"
            onChange={e => setDepartment(+e.target.value)}
          >
            <MenuItem value=""><em>— اختر القسم —</em></MenuItem>
            {departments.map(d => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth disabled={!department}>
          <InputLabel>الشعبة</InputLabel>
          <Select
            value={section}
            label="الشعبة"
            onChange={e => setSection(+e.target.value)}
          >
            <MenuItem value=""><em>— اختر الشعبة —</em></MenuItem>
            {sections.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth disabled={!section}>
          <InputLabel>الوحدة</InputLabel>
          <Select
            value={unit}
            label="الوحدة"
            onChange={e => setUnit(+e.target.value)}
          >
            <MenuItem value=""><em>— اختر الوحدة —</em></MenuItem>
            {units.map(u => (
              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <PrimaryButton onClick={handleRegister}>
          إنشاء حساب
        </PrimaryButton>
      </Box>
    </PageContainer>
  );
}
