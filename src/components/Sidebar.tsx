// src/components/OffcanvasSidebar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  styled,
  useTheme,
  useMediaQuery,
  Badge,
  Popover,
} from '@mui/material';
import useSWR from 'swr';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => res.json());

interface ContextItem { id: number; name: string }
interface DecodedToken {
  name: string;
  role: string;
  division?: ContextItem;
  department?: ContextItem;
  section?: ContextItem;
  unit?:ContextItem
}

const DRAWER_WIDTH = 280;
const NavLink = styled(Link)({
  textDecoration: 'none',
  color: 'inherit',
});

export default function OffcanvasSidebar() {
  const theme    = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const router   = useRouter();
  const pathname = usePathname();

  // ——— Hooks يجب أن تكون كلها هنا في البداية ———
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [open, setOpen] = useState(false);

  // جلب المستخدم
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) setUser(await res.json());
        else setUser(null);
      } catch {
        setUser(null);
      }
    })();
  }, [pathname]);
  const [viewOpen, setViewOpen] = useState(false);

  // إعداد التنقل
  const handleToggle = () => setOpen(o => !o);
  const handleClose  = () => setOpen(false);
const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      // هنا نحذف أي حالة محليّة إذا احتجت
      router.push('/login');
    } else {
      console.error('Logout failed');
    }
  };

  // التنبيهات: badge + popover
  const { data: countData, mutate: mutateCount } = useSWR(
    '/api/notifications/unread-count',
    fetcher,
    { refreshInterval: 30000 }
  );
  const unreadCount = countData?.unreadCount || 0;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [page, setPage]       = useState(1);
  const pageSize              = 10;

  const { data: listData, mutate: mutateList } = useSWR(
    anchorEl ? `/api/notifications?page=${page}&pageSize=${pageSize}` : null,
    fetcher
    
  );

const handleOpenNotif = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    // لا نعلّم أي شيء هنا، فقط نفتح الـ Popover
  };  const handleCloseNotif = () => {
    setAnchorEl(null);
    setPage(1);
  };

  // بعد كلّ الـ Hooks، نتحقّق من وجود user
  if (!user) return null;

  // إعداد روابط الشريط الجانبي بناءً على الدور
  const navConfig: Record<string, { href: string; label: string; icon: React.ReactNode }[]> = {
    'جهة مستفيدة': [
      { href: '/dashboard',            label: 'لوحة التحكم',    icon: <DashboardIcon /> },
      //{ href: '/dashboard/request/new', label: 'طلب جديد',      icon: <AddBoxIcon /> },
    ],
    'مدير شعبة': [
      { href: '/division/dashboard',           label: 'لوحة الشعبة',       icon: <DashboardIcon /> },
      { href: '/division/requests',            label: 'كل الطلبات',        icon: <ListAltIcon /> },
      { href: '/division/requests/in-progress',label: 'قيد الإنجاز',      icon: <HourglassEmptyIcon /> },
      { href: '/division/requests/completed',   label: 'الطلبات المنجزة',   icon: <CheckCircleIcon /> },
    ],
   
    'مسؤول وحدة': [
      { href: '/unit/dashboard',           label: 'لوحة الوحدة',       icon: <DashboardIcon /> },
      { href: '/unit/requests',            label: 'كل الطلبات',        icon: <ListAltIcon /> },
      { href: '/unit/requests/in-progress',label: 'قيد الإنجاز',      icon: <HourglassEmptyIcon /> },
      { href: '/unit/requests/completed',   label: 'الطلبات المنجزة',   icon: <CheckCircleIcon /> },
    ],
    'مدير قسم': [
      { href: '/admin/dashboard',               label: 'لوحة القسم',        icon: <DashboardIcon /> },
      { href: '/admin/requests',                label: 'كل الطلبات',        icon: <ListAltIcon /> },
      { href: '/admin/requests/in-progress',    label: 'قيد الإنجاز',      icon: <HourglassEmptyIcon /> },
      { href: '/admin/requests/completed',      label: 'الطلبات المنجزة',   icon: <CheckCircleIcon /> },
    ],
  };
  const links = navConfig[user.role] || [];
const userContexts = [
  { key: 'division',  label: 'التشكيل',  value: user.division?.name },
  { key: 'department', label: 'القسم',    value: user.department?.name },
  { key: 'section',    label: 'الشعبة',   value: user.section?.name },
  { key: 'unit',       label: 'الوحدة',   value: user.unit?.name },
];

  // ——— الآن بداية الـ JSX ———
  return (
    <>
      <AppBar position="fixed" color="primary" elevation={1}>
        <Toolbar
          sx={{
            display: 'flex',
            flexDirection: 'row-reverse',
            justifyContent: 'left',
            bgcolor: '#FAFAFA'
          }}
        >
          {!isDesktop && (
            <IconButton edge="end" color="info" onClick={handleToggle} sx={{ mr: 1, ml: 1 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="info" onClick={handleOpenNotif}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={handleCloseNotif}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: 300 } }}
            >
              <List sx={{ width: 300, maxHeight: 400, overflowY: 'auto' }}>
                {(!listData || listData.items.length === 0) && (
                  <ListItem>
                    <ListItemText primary="لا توجد تنبيهات جديدة." />
                  </ListItem>
                )}
                {listData?.items.map((notif: any) => (
                  <ListItem key={notif.id} disablePadding>
                 <ListItemButton
                   sx={{
                     bgcolor: notif.isRead ? 'inherit' : 'rgba(0,0,255,0.1)'
                   }}
                   onClick={async () => {
                     // علّم هذا التنبيه فقط كمقروء
                     await fetch(`/api/notifications/${notif.id}/mark-read`, {
                       method: 'POST',
                       credentials: 'include',
                     });
                     handleCloseNotif()
                     // حدّث العداد والقائمة
                     mutateCount();
                     mutateList();
                   // ثم ننتقل مع query param لفتح حوار السجل
    if (user?.role === 'جهة مستفيدة') {
      router.push(`/dashboard?viewHistory=${notif.requestId}`);
    } else if (user?.role === 'مدير قسم') {
      router.push(`/admin/dashboard?viewRequest=${notif.requestId}`);
    } else if (user?.role === 'مدير شعبة') {
      router.push(`/division/dashboard?viewRequest=${notif.requestId}`);
    }                   }}
                 >
                   <ListItemText
                     primary={notif.metadata.message}
                     secondary={new Date(notif.createdAt).toLocaleString()}
                   />
                 </ListItemButton>
               </ListItem>
                ))}
              </List>
            </Popover>
          </Box>

          <Box display="flex" alignItems="center" flexGrow={1} sx={{ justifyContent: 'flex-end' }}>
            <Image src="/logo.png" alt="Logo" width={40} height={40} />
            <Typography color="#4A4A4A" variant="h6" component="div" sx={{ mr: 2,ml: 2 }}>
              قسم تقنية المعلومات والاتصالات
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor={'right'}
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : open}
        onClose={handleClose}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: DRAWER_WIDTH } }}
      >
        <Box sx={{ height: theme.mixins.toolbar.minHeight }} />

        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: theme.palette.success.main, mx: 'auto', mb: 1 }}>
            {user.name.charAt(0)}
          </Avatar>
          <Typography variant="h6">{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user.role}</Typography>
        </Box>

        <Box sx={{ px: 2, mb: 2, textAlign: 'right' }}>
         {userContexts
    .filter(ctx => ctx.value)                  // فقط الحقول غير null أو فارغة
    .map(ctx => (
      <Typography key={ctx.key} variant="body2">
        <strong>{ctx.label}:</strong> {ctx.value}
      </Typography>
    ))
  }

        </Box>
        <Divider />

        <List>
          {links.map(({ href, label, icon }) => (
            <ListItem key={href} disablePadding>
              <NavLink href={href}>
                <ListItemButton onClick={!isDesktop ? handleClose : undefined} selected={pathname.startsWith(href)}>
                  <ListItemIcon sx={{ color: theme.palette.primary.main }}>{icon}</ListItemIcon>
                  <ListItemText primary={label} primaryTypographyProps={{ align: 'right' }} />
                </ListItemButton>
              </NavLink>
            </ListItem>
          ))}
        </List>
        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ color: theme.palette.error.main }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="تسجيل الخروج" primaryTypographyProps={{ align: 'right', color: 'error' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}
