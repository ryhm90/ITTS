// src/app/admin/dashboard/page.tsx
'use client';

import React, { useRef, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { showToast } from '@/lib/toast';
import { TabPanel } from '@mui/lab';

import {
  IconButton,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import {
  DialogTitle,
  Snackbar,
  Alert,
  Typography,
  Button,
  TextField,
} from '@mui/material';

import {
  PageContainer,
  HeaderRow,
  PageTitle,
  TablePaper,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBodyCell,
  Dialog,
  StyledTabContext,
  StyledTabList,
  StyledTab,
  DialogContent,
  DialogActions,
  SectionTitle,
  ChatContainer,
  ChatBubble,
  StyledForm,
  FullWidthTextField,
  FullWidthButton,
  PrimaryButton,
} from '@/components/StyledPageLayout';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import TablePagination from '@mui/material/TablePagination';

interface DeviceRequest {
  RequestID: number;
  Title: string;
  Status: string;
  RequestDate: string;
  service: string;
}

interface AdminRequest {
  RequestID: number;
  Title: string;
  Status: string;
  RequestDate: string;
  divisionName: string;
  departmentName: string;
  sectionName: string;
  deviceType: string;
  deviceNo: number;
  deviceDesc: string | null;
  service: string;

}

interface RequestDetails extends AdminRequest {
  Description: string;
  deviceId: number;
  service: string;
  memoID: string;
  memoDate: string;
  ImageUrls: string;
}

interface HistoryItem {
  ActionBy: string;
  ActionType: string;
  ActionNote?: string;
  ActionDate: string;
}

interface SectionItem { id: number; name: string; }
interface ContextItem { id: number; name: string; }

interface DecodedToken {
  name: string;
  role: string;
  division?: ContextItem;
  department?: ContextItem;
  section?: ContextItem;
}

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // حالة الطلبات
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // details dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RequestDetails | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequest[]>([]);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  // التبويبات في تفاصيل الطلب
  const [detailTab, setDetailTab] = useState<'0' | '1' | '2'>('0');

  // forward dialog
  const [forwardOpen, setForwardOpen] = useState(false);
  const [userCtx, setUserCtx] = useState<{ department: { id: number; name: string } } | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [forwardList, setForwardList] = useState<Array<{ sectionId: number | ''; note: string }>>([]);
  const [forwarding, setForwarding] = useState(false);

  // Snackbar عام
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const pathname = usePathname();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSending, setReviewSending] = useState(false);

  // Complete/Acknowledge dialog
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Decline confirmation dialog
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declining, setDeclining] = useState(false);

  // Summon confirmation dialog
  const [summonOpen, setSummonOpen] = useState(false);
  const [summoning, setSummoning] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // حالات خاصة بالمعاينة المنبثقة
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf'>('image');

  const handleOpenAttachment = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.endsWith('.pdf')) {
      setAttachmentType('pdf');
    } else {
      setAttachmentType('image');
    }
    setAttachmentUrl(url);
    setAttachmentModalOpen(true);
  };

  const handlePrintAttachment = () => {
    const w = window.open(attachmentUrl, '_blank');
    if (w) {
      w.focus();
      setTimeout(() => {
        w.print();
      }, 500);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests?page=${page}&pageSize=${pageSize}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const items = Array.isArray(json.items)
        ? json.items
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];
      setRequests(items);
      setTotal(json.total ?? items.length);
    } catch {
      showToast({ type: 'error', message: 'فشل في جلب الطلبات' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [page, pageSize]);

  // — دوال النقر على الأزرار الرئيسية —
  const handleView = (id: number) => {
    setSelectedReqId(id);
    setDetailOpen(true);
    setComment('');
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailTab('0');
    setSelectedReqId(null);
    setDetail(null);
    setHistory([]);
    setDeviceRequests([]);
    setComment('');
    setForwardOpen(false);
  };

  // — دوال التعليق —
  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      return setSnackbar({ message: 'اكتب تعليقاً أولاً', severity: 'error' });
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/requests/${selectedReqId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw await res.json();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تعليق',
        }),
      });
      setComment('');
      showToast({ type: 'success', message: 'تم إضافة التعليق' });
      // إعادة تحميل السجل
      const histRes = await fetch(`/api/admin/requests/${selectedReqId}/history`, { credentials: 'include' });
      if (histRes.ok) setHistory(await histRes.json());
      
      await loadRequests();
    } catch (err: any) {
      setSnackbar({ message: err.error || 'فشل إضافة التعليق', severity: 'error' });
    } finally {
      setSending(false);
    }
  };

  // — دوال المراجعة —
  const handleOpenReview = () => {
    setReviewComment('');
    setReviewOpen(true);
  };
  const handleCloseReview = () => setReviewOpen(false);

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      return setSnackbar({ message: 'اكتب نصّ المراجعة أولاً', severity: 'error' });
    }
    setReviewSending(true);
    try {
      const res = await fetch(`/api/admin/requests/${selectedReqId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: reviewComment }),
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم إرسال المراجعة وتحديث الحالة إلى معلق' });
      handleCloseReview();
      handleDetailClose();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تغير حالة',
        }),
      });
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل إرسال المراجعة' });
    } finally {
      setReviewSending(false);
    }
  };

  // — دوال تأكيد الإنجاز —
  const handleOpenComplete = () => setCompleteOpen(true);
  const handleCloseComplete = () => setCompleteOpen(false);

  const handleConfirmComplete = async () => {
    if (!selectedReqId) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/admin/requests/${selectedReqId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم تأكيد الإنجاز' });
      handleCloseComplete();
      handleDetailClose();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تغير حالة',
        }),
      });
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل في تأكيد الإنجاز' });
    } finally {
      setCompleting(false);
    }
  };

  // — دوال زر “اعتذار” يستخدم Dialog بدلاً من confirm —
  const handleOpenDecline = () => setDeclineOpen(true);
  const handleCloseDecline = () => setDeclineOpen(false);

  const handleConfirmDecline = async () => {
    if (!selectedReqId) return;
    setDeclining(true);
    try {
      const res = await fetch(`/api/admin/requests/${selectedReqId}/decline`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم تسجيل الاعتذار' });
      handleCloseDecline();
      handleDetailClose();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تغير حالة',
        }),
      });
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل تسجيل الاعتذار' });
    } finally {
      setDeclining(false);
    }
  };

  // — دوال زر “استقدام للاستلام” يستخدم Dialog بدلاً من confirm —
  const handleOpenSummon = () => setSummonOpen(true);
  const handleCloseSummon = () => setSummonOpen(false);

  const handleConfirmSummon = async () => {
    if (!selectedReqId) return;
    setSummoning(true);
    try {
      const res = await fetch(`/api/admin/requests/${selectedReqId}/summon`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم تسجيل الاستقدام للاستلام' });
      handleCloseSummon();
      handleDetailClose();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تغير حالة',
        }),
      });
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل تسجيل الاستقدام' });
    } finally {
      setSummoning(false);
    }
  };

  // — جلب تفاصيل الطلب عند تغيّر selectedReqId —
  useEffect(() => {
    if (selectedReqId == null) return;
    setDetailLoading(true);

    fetch(`/api/admin/requests/${selectedReqId}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: RequestDetails) => setDetail(data))
      .catch(() => {
        showToast({ type: 'error', message: 'فشل جلب تفاصيل الطلب' });
        handleDetailClose();
      });

    fetch(`/api/admin/requests/${selectedReqId}/history`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selectedReqId]);

  // — جلب طلبات نفس الجهاز —
  useEffect(() => {
    if (!detail) return;
    setDeviceRequests([]);

    fetch(`/api/admin/requests?deviceId=${detail.deviceId}&serviceName=${detail.service}&depName=${detail.departmentName}&divName=${detail.divisionName}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return [];
        const json = await r.json();
        if (Array.isArray(json)) return json as DeviceRequest[];
        if (Array.isArray((json as any).items)) return (json as any).items as DeviceRequest[];
        if (Array.isArray((json as any).data)) return (json as any).data as DeviceRequest[];
        return [];
      })
      .then(setDeviceRequests)
      .catch(() => setDeviceRequests([]));
  }, [detail]);

  // — جلب شعب القسم وقوائم التحويل السابقة بعد الحصول على userCtx —
  useEffect(() => {
    if (!userCtx) return;
    fetch(`/api/sections?departmentId=${userCtx.department.id}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(setSections)
      .catch(() => showToast({ type: 'error', message: 'فشل في جلب الشعب' }));

    fetch(`/api/admin/requests/${selectedReqId}/handlers`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(setForwarded)
      .catch(() => {});
  }, [userCtx]);

  // — دوال التحويل Forward —
  const [forwarded, setForwarded] = useState<
    { sectionId: number; sectionName: string; empName: string; note: string }[]
  >([]);

  const handleOpenForward = () => {
    setForwardOpen(true);
    setForwardList([{ sectionId: '', note: '' }]);
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUserCtx(data))
      .catch(() => showToast({ type: 'error', message: 'خطأ في المصادقة' }));
  };

  const handleAddSection = () => setForwardList(prev => [...prev, { sectionId: '', note: '' }]);
  const handleRemoveSection = (idx: number) => setForwardList(prev => prev.filter((_, i) => i !== idx));
  const handleChangeSection = (idx: number, sectionId: number) => {
    setForwardList(prev => {
      const c = [...prev];
      c[idx].sectionId = sectionId;
      return c;
    });
  };
  const handleChangeNote = (idx: number, note: string) => {
    setForwardList(prev => {
      const c = [...prev];
      c[idx].note = note;
      return c;
    });
  };

  const handleForward = async () => {
    setForwarding(true);
    try {
      for (const f of forwardList) {
        const divisionName = sections.find(s => s.id === f.sectionId)!.name;
        const res = await fetch(`/api/admin/requests/${selectedReqId}/forward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            divisionID: f.sectionId,
            division: divisionName,
            note: f.note,
          }),
        });
        if (!res.ok) throw await res.json();
      }
      showToast({ type: 'success', message: 'تم التحويل بنجاح' });
      handleDetailClose();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تحويل',
        }),
      });
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل في التحويل' });
    } finally {
      setForwarding(false);
    }
  };

  const actor = `${user?.role} - ${user?.department?.name} - ${user?.name}`;
React.useEffect(() => {
    const vr = searchParams.get('viewRequest');
    if (vr) {
      const id = Number(vr);
      if (!isNaN(id)) {
        handleView(id);
        // نظف الـ query من الـ URL
        router.replace('/admin/dashboard', { scroll: false });
      }
    }
  }, [searchParams, router]);
  return (
    <PageContainer>
      {/* رأس الصفحة */}
      <HeaderRow>
        <PageTitle>لوحة مدير القسم</PageTitle>
      </HeaderRow>

      {/* جدول الطلبات */}
      {!loading && requests.length === 0 && (
        <Typography align="center">لا توجد طلبات.</Typography>
      )}
      {!loading && requests.length > 0 && (
        <TablePaper>
          <Table>
            <TableHead>
              <TableRow>
                {['#', 'الموضوع', 'الهيكل الهرمي', 'الجهاز', 'الخدمة', 'الحالة', 'التاريخ', 'إجراء'].map(
                  h => (
                    <TableHeaderCell key={h}>{h}</TableHeaderCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <tbody>
              {requests.map(r => (
                <TableRow key={r.RequestID} hover>
                  <TableBodyCell>{r.RequestID}</TableBodyCell>
                  <TableBodyCell>{r.Title}</TableBodyCell>
                  <TableBodyCell>
                    {r.divisionName} &gt; {r.departmentName} &gt; {r.sectionName}
                  </TableBodyCell>
                  <TableBodyCell>
                    {r.deviceType}#{r.deviceNo}
                    {r.deviceDesc && ` (${r.deviceDesc})`}
                  </TableBodyCell>
                  <TableBodyCell>{r.service}</TableBodyCell>
                  <TableBodyCell>{r.Status}</TableBodyCell>
                  <TableBodyCell>
                    {new Date(r.RequestDate).toISOString().slice(0, 10)}
                  </TableBodyCell>
                  <TableBodyCell>
                    <IconButton onClick={() => handleView(r.RequestID)}>
                      <VisibilityIcon />
                    </IconButton>
                  </TableBodyCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page - 1} // 0-based index
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={e => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TablePaper>
      )}

      {/* — Dialog تفاصيل الطلب (Tabs) — */}
      <Dialog open={detailOpen} onClose={handleDetailClose} fullWidth maxWidth="md">
        <DialogTitle>تفاصيل الطلب #{detail?.RequestID}</DialogTitle>

        <StyledTabContext value={detailTab}>
          <StyledTabList onChange={(_, v) => setDetailTab(v)} variant="scrollable" scrollButtons="auto">
            <StyledTab label="التفاصيل" value="0" />
            <StyledTab label="طلبات بنفس الجهاز" value="1" />
            <StyledTab label="سجل العمليات" value="2" />
          </StyledTabList>

          <DialogContent>
            {/* Tab 0: التفاصيل */}
            <TabPanel value="0">
              {detailLoading || !detail ? (
                <Typography>جاري التحميل…</Typography>
              ) : (
                <>
                  <SectionTitle>معلومات الطلب</SectionTitle>
                  <Typography><strong>الخدمة:</strong> {detail.service}</Typography>
                  <Typography><strong>رقم المذكرة:</strong> {detail.memoID}</Typography>
                  <Typography>
                    <strong>تاريخ المذكرة:</strong>{' '}
                    {detail?.memoDate ? detail.memoDate.slice(0, 10) : ''}
                  </Typography>
                  <Typography><strong>الموضوع:</strong> {detail.Title}</Typography>
                  <Typography><strong>الوصف:</strong> {detail.Description}</Typography>
                  <Typography>
                    <strong>التاريخ:</strong> {new Date(detail.RequestDate).toISOString().slice(0, 10)}
                  </Typography>
                  <Typography><strong>الحالة:</strong> {detail.Status}</Typography>
                  <Typography>
                    <strong>الهيكل الهرمي:</strong><br />
                    {detail.divisionName} &gt; {detail.departmentName} &gt; {detail.sectionName}
                  </Typography>
                  <Typography>
                    <strong>الجهاز:</strong> {detail.deviceType}#{detail.deviceNo}
                    {detail.deviceDesc && ` (${detail.deviceDesc})`}
                  </Typography>

                  {/* قسم المرفقات */}
                  {detail.ImageUrls && detail.ImageUrls.trim() !== '' && (
                    <>
                      <SectionTitle sx={{ mt: 2 }}>المرفقات</SectionTitle>
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 2,
                          mt: 1,
                        }}
                      >
                        {detail.ImageUrls.split(',').map((url, idx) => {
                          const trimmed = url.trim();
                          if (!trimmed) return null;

                          if (trimmed.toLowerCase().endsWith('.pdf')) {
                            return (
                              <Box
                                key={idx}
                                sx={{
                                  width: 80,
                                  height: 100,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid #ccc',
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleOpenAttachment(trimmed)}
                              >
                                <PictureAsPdfIcon fontSize="large" color="error" />
                                <Typography variant="caption" noWrap sx={{ mt: 0.5 }}>
                                  PDF #{idx + 1}
                                </Typography>
                              </Box>
                            );
                          }

                          return (
                            <Box
                              key={idx}
                              sx={{
                                width: 80,
                                height: 80,
                                overflow: 'hidden',
                                border: '1px solid #ccc',
                                borderRadius: 1,
                                cursor: 'pointer',
                              }}
                              onClick={() => handleOpenAttachment(trimmed)}
                            >
                              <img
                                src={trimmed}
                                alt={`المرفق ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}

                  {/* تجميع الأزرار بشكل احترافي */}
                  <Box
                    mt={2}
                    sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}
                  >
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleOpenComplete}
                      disabled={!detail || detail.Status === 'تأكيد انجاز' || detail.Status === 'اعتذار' || detail.Status === 'مراجعة الطلب'}
                      sx={{ ml: 1 }}
                    >
                      تأكيد الإنجاز
                    </Button>

                    <Button
                      variant="contained"
                      color="warning"
                      onClick={handleOpenDecline}
                      sx={{ ml: 1 }}
                      disabled={!detail || detail.Status === 'اعتذار'}

                    >
                      اعتذار
                    </Button>

                    <Button
                      variant="contained"
                      color="info"
                      onClick={handleOpenSummon}
                      disabled={!detail || detail.Status !== 'تم التوجيه'}
                      sx={{ ml: 1 }}
                    >
                      استقدام للاستلام
                    </Button>

                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleOpenReview}
                      disabled={!detail || detail.Status === 'معلق' || detail.Status === 'اعتذار'}
                      sx={{ ml: 1 }}
                    >
                      مراجعة الطلب
                    </Button>

                    <PrimaryButton 
                    disabled={!detail || detail.Status === 'اعتذار' || detail.Status === 'مكتمل' }
                    onClick={handleOpenForward} sx={{ ml: 1 }}>
                      تحويل الطلب
                    </PrimaryButton>
                  </Box>
                </>
              )}
            </TabPanel>

            {/* Tab 1: طلبات بنفس الجهاز */}
            <TabPanel value="1">
              {deviceRequests.length === 0 ? (
                <Typography>لا توجد طلبات أخرى لنفس الجهاز.</Typography>
              ) : (
                <>
                  <SectionTitle>طلبات بنفس الجهاز</SectionTitle>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['#', 'الموضوع', 'الخدمة', 'الحالة', 'التاريخ', 'إجراء'].map(h => (
                          <TableHeaderCell key={h}>{h}</TableHeaderCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <tbody>
                      {deviceRequests.map(dr => (
                        <TableRow key={dr.RequestID} hover>
                          <TableBodyCell>{dr.RequestID}</TableBodyCell>
                          <TableBodyCell>{dr.Title}</TableBodyCell>
                          <TableBodyCell>{dr.service}</TableBodyCell>
                          <TableBodyCell>{dr.Status}</TableBodyCell>
                          <TableBodyCell>
                            {new Date(dr.RequestDate).toISOString().slice(0, 10)}
                          </TableBodyCell>
                          <TableBodyCell>
                              <IconButton size="small" onClick={() => handleView(dr.RequestID)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                          </TableBodyCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </TabPanel>

            {/* Tab 2: سجل العمليات + إضافة تعليق */}
            <TabPanel value="2">
              <SectionTitle>سجل العمليات</SectionTitle>
              <ChatContainer variant="outlined">
                {history.length === 0 ? (
                  <Typography>لا توجد عمليات بعد.</Typography>
                ) : history.map((h, i) => (
                  <ChatBubble key={i} mine={h.ActionBy === actor}>
                    <strong>{h.ActionType}</strong>
                    {h.ActionNote && ` — ${h.ActionNote}`}
                    <br />
                    <small>
                      بواسطة {h.ActionBy} في {new Date(h.ActionDate).toLocaleString()}
                    </small>
                  </ChatBubble>
                ))}
                <div ref={chatEndRef} />
              </ChatContainer>

              <SectionTitle>إضافة تعليق</SectionTitle>
              <StyledForm onSubmit={handleComment}>
                <FullWidthTextField
                  multiline
                  minRows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="اكتب تعليقك هنا…"
                />
                <FullWidthButton type="submit" variant="contained" disabled={sending}>
                  {sending ? 'جاري الإرسال…' : 'إرسال التعليق'}
                </FullWidthButton>
              </StyledForm>
            </TabPanel>
          </DialogContent>
        </StyledTabContext>

        {/* — Dialog معاينة المرفق بحجم كبير + طباعة — */}
        <Dialog
          open={attachmentModalOpen}
          onClose={() => setAttachmentModalOpen(false)}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle>معاينة المرفق</DialogTitle>
          <DialogContent sx={{ textAlign: 'center', p: 0 }}>
            {attachmentType === 'pdf' ? (
              <Box sx={{ width: '100%', height: '80vh' }}>
                <object
                  data={attachmentUrl}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                >
                  <Typography sx={{ mt: 2 }}>
                    عذراً، المتصفح الحالي لا يدعم عرض ملفات PDF. يمكنك&nbsp;
                    <Button
                      component="a"
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      تحميل PDF
                    </Button>
                    &nbsp;وطباعته من هناك.
                  </Typography>
                </object>
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '80vh',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: '#000',
                }}
              >
                <img
                  src={attachmentUrl}
                  alt="Attachment Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handlePrintAttachment}
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
            >
              طباعة المرفق
            </Button>
            <Button onClick={() => setAttachmentModalOpen(false)}>إغلاق</Button>
          </DialogActions>
        </Dialog>

        <DialogActions>
          <Button onClick={handleDetailClose}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* — Decline Confirmation Dialog — */}
      <Dialog open={declineOpen} onClose={handleCloseDecline} fullWidth maxWidth="xs">
        <DialogTitle>اعتذار الطلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من أنك تريد تسجيل اعتذار هذا الطلب؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDecline}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmDecline}
            disabled={declining}
          >
            {declining ? 'جاري…' : 'نعم، اعتذار'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* — Summon Confirmation Dialog — */}
      <Dialog open={summonOpen} onClose={handleCloseSummon} fullWidth maxWidth="xs">
        <DialogTitle>استقدام للاستلام #{selectedReqId}</DialogTitle>
        <DialogContent>
          <Typography>هل تريد استقدام هذا الطلب للاستلام؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSummon}>إلغاء</Button>
          <Button
            variant="contained"
            color="info"
            onClick={handleConfirmSummon}
            disabled={summoning}
          >
            {summoning ? 'جاري…' : 'نعم، استقدام'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* — Forward Dialog — */}
      <Dialog open={forwardOpen} onClose={() => setForwardOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تحويل طلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          {forwardList.map((item, idx) => (
            <Box key={idx} display="flex" gap={2} alignItems="center" mb={2}>
              <FormControl fullWidth>
                <InputLabel>اختر شعبة</InputLabel>
                <Select
                  value={item.sectionId}
                  label="اختر شعبة"
                  onChange={e => handleChangeSection(idx, e.target.value as number)}
                >
                  <MenuItem value=""><em>—</em></MenuItem>
                  {sections.map(s => {
                    const alreadySelectedInThisModal = forwardList
                      .some((f, j) => j !== idx && f.sectionId === s.id);
                    const alreadyForwardedBefore = forwarded
                      .some(f => f.sectionId === s.id);
                    return (
                      <MenuItem
                        key={s.id}
                        value={s.id}
                        disabled={alreadySelectedInThisModal || alreadyForwardedBefore}
                      >
                        {s.name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="ملاحظة (اختياري)"
                value={item.note}
                onChange={e => handleChangeNote(idx, e.target.value)}
              />
              <IconButton color="error" onClick={() => handleRemoveSection(idx)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={handleAddSection}>
            إضافة شعبة جديدة
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardOpen(false)}>إلغاء</Button>
          <Button variant="contained" disabled={forwarding} onClick={handleForward}>
            {forwarding ? 'جاري التحويل…' : 'تأكيد التحويل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* — Review Dialog — */}
      <Dialog open={reviewOpen} onClose={handleCloseReview} fullWidth maxWidth="sm">
        <DialogTitle>مراجعة الطلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          <SectionTitle>نصّ المراجعة</SectionTitle>
          <FullWidthTextField
            multiline
            minRows={4}
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="اكتب استفسارك أو ملاحظتك هنا…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReview}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitReview}
            disabled={reviewSending}
          >
            {reviewSending ? 'جاري الإرسال…' : 'أرسل المراجعة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* — Complete Dialog — */}
      <Dialog open={completeOpen} onClose={handleCloseComplete} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد إنجاز الطلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          <Typography>هل تريد حقاً تأكيد إنجاز هذا الطلب؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseComplete}>إلغاء</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmComplete}
            disabled={completing}
          >
            {completing ? 'جاري…' : 'نعم، تأكيد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* — Snackbar عام — */}
      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)}>
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
