// src/app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Link from 'next/link';
import { showToast } from '@/lib/toast';
import {
  PageContainer,
  HeaderRow,
  PageTitle,
  PrimaryButton,
  TablePaper,
  TableHeaderCell,
  TableBodyCell,
} from '@/components/StyledComponents';

interface AdminRequest {
  RequestID:      number;
  Title:          string;
  Status:         string;
  RequestDate:    string;
  divisionName:   string;
  departmentName: string;
  sectionName:    string;
  deviceType:     string;
  deviceNo:       number;
  deviceDesc:     string | null;
}
interface RequestDetails extends AdminRequest {
  Description: string;
}
interface HistoryItem {
  ActionBy:   string;
  ActionType: string;
  ActionNote?:string;
  ActionDate: string;
}
interface DeviceRequest {
  RequestID:   number;
  Title:       string;
  Status:      string;
  RequestDate: string;
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading]   = useState(true);

  // Dialog + detail state
  const [detailOpen, setDetailOpen]           = useState(false);
  const [selectedReqId, setSelectedReqId]     = useState<number|null>(null);
  const [detailLoading, setDetailLoading]     = useState(false);
  const [detail, setDetail]                   = useState<RequestDetails|null>(null);
  const [history, setHistory]                 = useState<HistoryItem[]>([]);
  const [deviceRequests, setDeviceRequests]   = useState<DeviceRequest[]>([]);
  const [comment, setComment]                 = useState('');
  const [sending, setSending]                 = useState(false);

  const [snackbar, setSnackbar] = useState<{message:string;severity:'success'|'error'}|null>(null);

  // 1) load list
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/requests', { credentials:'include' });
        if (!res.ok) throw new Error(res.statusText);
        setRequests(await res.json());
      } catch {
        showToast({ type:'error', message:'فشل في جلب الطلبات' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) whenever selectedReqId changes, fetch its detail/history/deviceRequests
  useEffect(() => {
    if (selectedReqId == null) return;
    setDetailLoading(true);

    // details
    fetch(`/api/admin/requests/${selectedReqId}`, { credentials:'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data:RequestDetails) => setDetail(data))
      .catch(() => {
        showToast({ type:'error', message:'فشل جلب تفاصيل الطلب' });
        setDetailOpen(false);
      });

    // history
    fetch(`/api/admin/requests/${selectedReqId}/history`, { credentials:'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setHistory)
      .catch(()=>{});

    // other requests on same device
    fetch(`/api/admin/requests?deviceId=${selectedReqId}`, { credentials:'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setDeviceRequests)
      .catch(()=>{})
      .finally(()=>setDetailLoading(false));
  }, [selectedReqId]);

  // open dialog
  const handleView = (id:number) => {
    setSelectedReqId(id);
    setDetailOpen(true);
    setComment('');
  };
  // close
  const handleClose = () => {
    setDetailOpen(false);
    setSelectedReqId(null);
    setDetail(null);
    setHistory([]);
    setDeviceRequests([]);
    setComment('');
  };

  // add comment
  const handleComment = async (e:FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      return setSnackbar({ message:'اكتب تعليقاً أولاً', severity:'error' });
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/requests/${selectedReqId}/comment`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body:JSON.stringify({ comment })
      });
      if (!res.ok) throw await res.json();
      setComment('');
      showToast({ type:'success', message:'تم إضافة التعليق' });
      // reload history
      fetch(`/api/admin/requests/${selectedReqId}/history`, { credentials:'include' })
        .then(r => r.ok? r.json(): [])
        .then(setHistory);
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تعليق',
        }),
      });
    } catch (err:any) {
      setSnackbar({ message: err.error||'فشل إضافة التعليق', severity:'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <HeaderRow>
        <PageTitle>لوحة مدير القسم</PageTitle>
        <Link href="/admin/requests" passHref>
          <PrimaryButton color="secondary">
            الطلبات ({requests.filter(r=>r.Status==='قيد الإستلام').length})
          </PrimaryButton>
        </Link>
      </HeaderRow>

      { !loading && requests.length===0 && (
        <Typography align="center">لا توجد طلبات.</Typography>
      )}

      { loading===false && requests.length>0 && (
        <TablePaper>
          <Table>
            <TableHead>
              <TableRow>
                {['#','الموضوع','الهيكل الهرمي','الجهاز','الحالة','تاريخ التقديم','إجراء']
                  .map(l=>(
                    <TableHeaderCell key={l} align="center">{l}</TableHeaderCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map(r=>(
                <TableRow key={r.RequestID} hover>
                  <TableBodyCell align="center">{r.RequestID}</TableBodyCell>
                  <TableBodyCell align="center">{r.Title}</TableBodyCell>
                  <TableBodyCell align="center">
                    {r.divisionName} &gt; {r.departmentName} &gt; {r.sectionName}
                  </TableBodyCell>
                  <TableBodyCell align="center">
                    {r.deviceType} #{r.deviceNo}
                    {r.deviceDesc && ` (${r.deviceDesc})`}
                  </TableBodyCell>
                  <TableBodyCell align="center">{r.Status}</TableBodyCell>
                  <TableBodyCell align="center">
                    {new Date(r.RequestDate).toISOString().slice(0, 10)}
                  </TableBodyCell>
                  <TableBodyCell align="center">
                    <IconButton
                      color="primary"
                      onClick={()=>handleView(r.RequestID)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableBodyCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TablePaper>
      )}

      {/* — Details Dialog — */}
      <Dialog
        open={detailOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          تفاصيل الطلب #{detail?.RequestID}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading || !detail ? (
            <Typography>جاري التحميل…</Typography>
          ) : (
            <>
              {/* basic info */}
              <Typography gutterBottom>
                <strong>الموضوع:</strong> {detail.Title}
              </Typography>
              <Typography gutterBottom>
                <strong>الوصف:</strong> {detail.Description}
              </Typography>
              <Typography gutterBottom>
                <strong>تاريخ التقديم:</strong>{' '}
                {new Date(detail.RequestDate).toISOString().slice(0, 10)}
              </Typography>
              <Typography gutterBottom>
                <strong>الحالة:</strong> {detail.Status}
              </Typography>
              <Typography gutterBottom>
                <strong>الهيكل الهرمي:</strong><br/>
                {detail.divisionName} &gt; {detail.departmentName} &gt; {detail.sectionName}
              </Typography>
              <Typography gutterBottom>
                <strong>الجهاز:</strong><br/>
                {detail.deviceType} #{detail.deviceNo}
              </Typography>

              {/* other requests */}
              {deviceRequests.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt:2 }}>طلبات بنفس الجهاز</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['#','الموضوع','الحالة','التاريخ','إجراء'].map(h=>(
                          <TableCell key={h} align="center"><strong>{h}</strong></TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deviceRequests.map(dr=>(
                        <TableRow key={dr.RequestID} hover>
                          <TableCell align="center">{dr.RequestID}</TableCell>
                          <TableCell align="center">{dr.Title}</TableCell>
                          <TableCell align="center">{dr.Status}</TableCell>
                          <TableCell align="center">
                            {new Date(dr.RequestDate).toISOString().slice(0, 10)}
                          </TableCell>
                          <TableBodyCell>
                              <IconButton size="small" onClick={() => handleView(dr.RequestID)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                          </TableBodyCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              {/* history */}
              <Typography variant="h6" sx={{ mt:2 }}>سجل العمليات</Typography>
              {history.length===0 ? (
                <Typography>لا توجد عمليات بعد.</Typography>
              ) : (
                history.map((h,i)=>(
                  <Typography
                    key={i}
                    sx={{
                      p:1, my:1, bgcolor:'grey.100', borderRadius:1
                    }}
                  >
                    <strong>بواسطة:</strong> {h.ActionBy} —{' '}
                    <strong>الإجراء:</strong> {h.ActionType}
                    {h.ActionNote && <> — <strong>ملاحظة:</strong> {h.ActionNote}</>}
                    <br/>
                    <small>{new Date(h.ActionDate).toLocaleString()}</small>
                  </Typography>
                ))
              )}

              {/* add comment */}
              <Typography variant="h6" sx={{ mt:2 }}>إضافة تعليق</Typography>
              <form onSubmit={handleComment}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  value={comment}
                  onChange={e=>setComment(e.target.value)}
                  placeholder="اكتب تعليقك هنا..."
                  sx={{ mb:2 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  disabled={sending}
                >
                  {sending? 'جاري الإرسال…':'إرسال التعليق'}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={()=>setSnackbar(null)}
        anchorOrigin={{ vertical:'top', horizontal:'center' }}
      >
        <Alert
          severity={snackbar?.severity}
          onClose={()=>setSnackbar(null)}
          sx={{ width:'100%' }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
