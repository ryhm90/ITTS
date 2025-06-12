'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { showToast } from '@/lib/toast';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/socket');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast({ type: 'success', message: 'تم تسجيل الدخول بنجاح' });
        router.push('/dashboard');
      } else {
        showToast({ type: 'error', message: data.message || 'فشل تسجيل الدخول' });
      }
    } catch {
      showToast({ type: 'error', message: 'حدث خطأ أثناء محاولة تسجيل الدخول' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <Box mb={2} display="flex" justifyContent="center">
          <Image src="/logo.png" alt="Logo" width={80} height={80} />
        </Box>

        {/* Department Name */}
        <Typography
          variant="subtitle1"
          color="text.secondary"
          gutterBottom
        >
          قسم تقنية المعلومات والاتصالات
        </Typography>

        {/* Login Form */}
        <Typography variant="h5" component="h1" gutterBottom>
          تسجيل الدخول
        </Typography>

        <Box component="form" onSubmit={handleLogin} noValidate>
          <TextField
            label="البريد الإلكتروني"
            variant="outlined"
            fullWidth
            margin="normal"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <TextField
            label="كلمة المرور"
            variant="outlined"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ mt: 3, py: 1.5 }}
          >
            {loading
              ? <CircularProgress size={24} color="inherit" />
              : 'دخول'
            }
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
