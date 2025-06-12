'use client';

import React from 'react';
import useSWR from 'swr';
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function AppHeader() {
  // 1) ننادي /api/notifications/unread-count لبناء الـ Badge
  const { data: countData, mutate: mutateCount } = useSWR(
    '/api/notifications/unread-count',
    fetcher,
    { refreshInterval: 30000 }
  );
  const unreadCount = countData?.unreadCount || 0;
  // 2) Popover state
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // 3) ننادي /api/notifications?page=…&pageSize=… عندما يكون Popover مفتوح
  const { data: listData, mutate: mutateList } = useSWR(
    anchorEl ? `/api/notifications?page=${page}&pageSize=${pageSize}` : null,
    fetcher
  );

  // 4) Handler لفتح Popover
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);

    // فور فتح الـ popover، نعلّم كل التنبيهات مقروءة:
    fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      credentials: 'include',
    }).then(() => {
      mutateCount(); // badge = 0
      mutateList(); // يحدث قائمة التنبيهات (لتصبح isRead: true)
    });
  };

  const handleClose = () => {
    setAnchorEl(null);
    setPage(1);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {/* أيقونة التنبيهات + Badge */}
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
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
                onClick={() => {
                  // عند النقر ننتقل إلى الرابط المخزون في notif.metadata.link
                  window.location.href = notif.metadata.link;
                }}
                sx={{
                  bgcolor: notif.isRead ? 'inherit' : 'rgba(0, 0, 255, 0.1)',
                }}
              >
                <ListItemText
                  primary={notif.metadata.message}
                  secondary={new Date(notif.createdAt).toLocaleString()}
                />
              </ListItemButton>
            </ListItem>
          ))}

          {listData && listData.total > pageSize && (
            <ListItem disablePadding>
              <ListItemButton onClick={() => setPage((p) => p + 1)}>
                <ListItemText sx={{ textAlign: 'center' }} primary="المزيد…" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Popover>
    </Box>
  );
}
