// src/app/division/dashboard/page.tsx
'use client';
import React, { useRef, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  IconButton,
  Box,
  Select,
  MenuItem,
  InputLabel,
  
  FormControl,
  DialogTitle,
  Snackbar,
  Alert,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { TabPanel } from '@mui/lab';

import { showToast } from '@/lib/toast';
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
import TablePagination from '@mui/material/TablePagination';
import { useRouter, usePathname } from 'next/navigation';

interface DivisionRequest {
  RequestID: number;
  Title: string;
  RequestDate: string;
  Status: string;
  divisionName: string;
  departmentName: string;
  sectionName: string;
  deviceType: string;
  deviceNo: number;
  deviceDesc?: string;
  service: string;
}

interface RequestDetail extends DivisionRequest {
  Description: string;
  deviceId: number;
  sectionId: number;
  service: string;
  memoID: string;
  memoDate: string;
  ImageUrls: string; // comma-separated URLs
}

interface HistoryItem {
  ActionType: string;
  ActionNote?: string;
  ActionBy: string;
  ActionDate: string;
}

interface DeviceRequest {
  RequestID: number;
  Title: string;
  Status: string;
  RequestDate: string;
  service: string;
}

interface Unit {
  id: number;
  name: string;
}

interface Employee {
  SectionEmployeeID: number;
  FullName: string;
}

interface ContextItem { id: number; name: string }
interface DecodedToken {
  name: string;
  role: string;
  division?: ContextItem;
  department?: ContextItem;
  section?: ContextItem;
}

type ForwardRow = {
  unitId: number | '';
  empRows: { id: number; note: string }[];
};

export default function DivisionDashboard() {
  const router = useRouter();
  const pathname = usePathname();

  // — Main requests list and pagination
  const [requests, setRequests] = useState<DivisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Snackbar general
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // — Details dialog and its data
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequest[]>([]);
  const [detailTab, setDetailTab] = useState<'0' | '1' | '2'>('0');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // — Comment section
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  // — User info (for chat bubble highlighting)
  const [user, setUser] = useState<DecodedToken | null>(null);

  // — “تأكيد الإنجاز” dialog
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  // — “استقدام للاستلام” dialog
  const [summonOpen, setSummonOpen] = useState(false);
  const [summoning, setSummoning] = useState(false);

  // — Attachments preview dialog
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf'>('image');

  // — Forward modal
  const [forwardOpen, setForwardOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitEmployeesMap, setUnitEmployeesMap] = useState<Record<number, Employee[]>>({});
  const [forwardList, setForwardList] = useState<ForwardRow[]>([]);
  const [forwarding, setForwarding] = useState(false);

  // — Load current user on route change
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        setUser(null);
      }
    })();
  }, [pathname]);

  // — Fetch main requests with pagination
  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/division/requests/in-progress?page=${page}&pageSize=${pageSize}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      // توقع أن تكون الصيغة: { items: [...], total: number }
      const items = Array.isArray(json.items) ? json.items : Array.isArray(json) ? json : [];
      setRequests(items as DivisionRequest[]);
      setTotal(json.total ?? items.length);
    } catch {
      setSnackbar({ message: 'فشل في جلب طلبات الشعبة', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [page, pageSize]);

  // — Handler لفتح تفاصيل الطلب
  const handleView = async (id: number) => {
    setSelectedReqId(id);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [reqRes, histRes, sameRes] = await Promise.all([
        fetch(`/api/division/requests/${id}`, { credentials: 'include' }),
        fetch(`/api/admin/requests/${id}/history`, { credentials: 'include' }),
        fetch(`/api/division/requests?deviceId=${id}`, { credentials: 'include' }),
      ]);
      if (reqRes.ok) setDetail(await reqRes.json());
      if (histRes.ok) setHistory(await histRes.json());
      // تأكد من إرجاع مصفوفة
      if (sameRes.ok) {
        const drJson = await sameRes.json();
        if (Array.isArray(drJson)) setDeviceRequests(drJson as DeviceRequest[]);
        else if (drJson.items && Array.isArray(drJson.items)) setDeviceRequests(drJson.items as DeviceRequest[]);
        else setDeviceRequests([]);
      }
    } catch {
      showToast({ type: 'error', message: 'فشل في تحميل التفاصيل' });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // — إغلاق حوار التفاصيل
  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailTab('0');
    setSelectedReqId(null);
    setDetail(null);
    setHistory([]);
    setDeviceRequests([]);
    setForwardList([]);
    setComment('');
  };

  // — إضافة تعليق
  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !selectedReqId) {
      showToast({ type: 'error', message: 'اكتب تعليقاً أولاً' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/division/requests/${selectedReqId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم إضافة التعليق' });
      setComment('');
      // إعادة تحميل السجل
      const h = await fetch(`/api/admin/requests/${selectedReqId}/history`, { credentials: 'include' });
      if (h.ok) setHistory(await h.json());
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل إضافة التعليق' });
    } finally {
      setSending(false);
    }
  };

  // — إعداد “تأكيد الإنجاز”
  const handleOpenComplete = () => setCompleteOpen(true);
  const handleCloseComplete = () => setCompleteOpen(false);
  const handleConfirmComplete = async () => {
    if (!selectedReqId) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/division/requests/${selectedReqId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم تأكيد الإنجاز' });
      handleCloseComplete();
      handleDetailClose();
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل في تأكيد الإنجاز' });
    } finally {
      setCompleting(false);
    }
  };

  // — إعداد “استقدام للاستلام”
  const handleOpenSummon = () => setSummonOpen(true);
  const handleCloseSummon = () => setSummonOpen(false);
  const handleConfirmSummon = async () => {
    if (!selectedReqId) return;
    setSummoning(true);
    try {
      const res = await fetch(`/api/division/requests/${selectedReqId}/summon`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم تسجيل الاستقدام للاستلام' });
      handleCloseSummon();
      handleDetailClose();
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل تسجيل الاستقدام' });
    } finally {
      setSummoning(false);
    }
  };

  // — فتح معاينة المرفقات
  const handleOpenAttachment = (url: string) => {
    const lower = url.toLowerCase();
    setAttachmentType(lower.endsWith('.pdf') ? 'pdf' : 'image');
    setAttachmentUrl(url);
    setAttachmentModalOpen(true);
  };
  const handlePrintAttachment = () => {
    const w = window.open(attachmentUrl, '_blank');
    if (w) {
      w.focus();
      setTimeout(() => w.print(), 500);
    }
  };

  // — فتح “تحويل الطلب”
  const openForward = async () => {
    if (!detail) return;
    setForwardList([]);
    setForwardOpen(true);
    try {
      const res = await fetch('/api/division/units', { credentials: 'include' });
      if (res.ok) setUnits(await res.json());
    } catch {
      showToast({ type: 'error', message: 'فشل في جلب الوحدات' });
    }
  };
  const addForwardRow = () =>
    setForwardList((fl) => [...fl, { unitId: '', empRows: [] }]);
  const removeForwardRow = (idx: number) =>
    setForwardList((fl) => fl.filter((_, i) => i !== idx));

  // — جلب الموظفين عند اختيار وحدة
  useEffect(() => {
    forwardList.forEach((row) => {
      if (row.unitId && !unitEmployeesMap[row.unitId]) {
        fetch(`/api/division/employees?unitId=${row.unitId}`, { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : []))
          .then((emps: Employee[]) =>
            setUnitEmployeesMap((m) => ({ ...m, [row.unitId as number]: emps }))
          )
          .catch(() => {});
      }
    });
  }, [forwardList]);

  // — إرسال “تحويل الطلب”
  const handleForward = async () => {
    if (forwardList.some((f) => !f.unitId || f.empRows.length === 0)) {
      showToast({ type: 'error', message: 'اكمل تعبئة كل صف' });
      return;
    }
    setForwarding(true);
    try {
      const payload = forwardList.map((r) => ({
        divisionID: r.unitId,
        division: units.find((u) => u.id === r.unitId)!.name,
        employees: r.empRows.map((er) => ({ id: er.id, note: er.note })),
      }));
      const res = await fetch(`/api/division/requests/${selectedReqId}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ forwards: payload }),
      });
      if (!res.ok) throw await res.json();
      showToast({ type: 'success', message: 'تم التحويل بنجاح' });
      setForwardOpen(false);
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل في التحويل' });
    } finally {
      setForwarding(false);
    }
  };

  // — Scroll to bottom عند فتح تبويب السجل أو تغيّره
  useEffect(() => {
    if (detailTab === '2') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detailTab, history]);

  // — Main render
  const actor = `${user?.role} - ${user?.section?.name} - ${user?.name}`;

  return (
    <PageContainer>
      <HeaderRow>
        <PageTitle>الطلبات قيد الانجاز</PageTitle>
      </HeaderRow>

      {/* — جدول الطلبات مع pagination */}
      {loading ? (
        <Typography align="center" sx={{ py: 6 }}>
          جاري التحميل…
        </Typography>
      ) : requests.length === 0 ? (
        <Typography align="center" color="text.secondary">
          لا توجد طلبات حالياً.
        </Typography>
      ) : (
        <TablePaper>
          <Table>
            <TableHead>
              <TableRow>
                {[
                  '#',
                  'الموضوع',
                  'الهيكل الهرمي',
                  'الجهاز',
                  'تاريخ الطلب',
                  'الخدمة',
                  'الحالة',
                  'إجراء',
                ].map((h) => (
                  <TableHeaderCell key={h}>{h}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <tbody>
              {requests.map((r) => (
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
                  <TableBodyCell>{r.RequestDate.slice(0, 10)}</TableBodyCell>
                  <TableBodyCell>{r.service}</TableBodyCell>
                  <TableBodyCell>{r.Status}</TableBodyCell>
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
            page={page - 1}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
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
            {/* --- Tab 0: تفاصيل الأساس --- */}
            <TabPanel value="0">
              {detailLoading || !detail ? (
                <Typography>جاري التحميل…</Typography>
              ) : (
                <>
                  <SectionTitle>معلومات الطلب</SectionTitle>
                  <Typography>
                    <strong>الخدمة:</strong> {detail.service}
                  </Typography>
                  <Typography>
                    <strong>رقم المذكرة:</strong> {detail.memoID}
                  </Typography>
                  <Typography>
                    <strong>تاريخ المذكرة:</strong> {detail.memoDate.slice(0, 10)}
                  </Typography>
                  <Typography>
                    <strong>الموضوع:</strong> {detail.Title}
                  </Typography>
                  <Typography>
                    <strong>الوصف:</strong> {detail.Description}
                  </Typography>
                  <Typography>
                    <strong>تاريخ الطلب:</strong> {new Date(detail.RequestDate).toISOString().slice(0, 10)}
                  </Typography>
                  <Typography>
                    <strong>الحالة:</strong> {detail.Status}
                  </Typography>
                  <Typography>
                    <strong>الهيكل الهرمي:</strong>
                    <br />
                    {detail.divisionName} &gt; {detail.departmentName} &gt; {detail.sectionName}
                  </Typography>
                  <Typography>
                    <strong>الجهاز:</strong> {detail.deviceType}#{detail.deviceNo}
                    {detail.deviceDesc && ` (${detail.deviceDesc})`}
                  </Typography>

                  {/* --- قسم المرفقات --- */}
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

                  {/* --- زر الاستقدام والتحويل وتأكيد الإنجاز --- */}
                  <Box mt={2} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleOpenComplete}
                      disabled={!detail || detail.Status === 'تأكيد انجاز' || detail.Status === 'اعتذار' || detail.Status === 'مراجعة الطلب'}
                    >
                      تأكيد الإنجاز
                    </Button>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={handleOpenSummon}
                      disabled={!detail || detail.Status !== 'تم التوجيه'}
                    >
                      استقدام للاستلام
                      {summoning && '…'}
                    </Button>
                    <PrimaryButton onClick={openForward}>تحويل الطلب</PrimaryButton>
                  </Box>
                </>
              )}
            </TabPanel>

            {/* --- Tab 1: طلبات بنفس الجهاز --- */}
            <TabPanel value="1">
              {deviceRequests.length === 0 ? (
                <Typography>لا توجد طلبات أخرى لنفس الجهاز.</Typography>
              ) : (
                <>
                  <SectionTitle>طلبات بنفس الجهاز</SectionTitle>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['#', 'الموضوع', 'الخدمة', 'الحالة', 'التاريخ', 'إجراء'].map((h) => (
                          <TableHeaderCell key={h}>{h}</TableHeaderCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <tbody>
                      {deviceRequests.map((dr) => (
                        <TableRow key={dr.RequestID} hover>
                          <TableBodyCell>{dr.RequestID}</TableBodyCell>
                          <TableBodyCell>{dr.Title}</TableBodyCell>
                          <TableBodyCell>{dr.service}</TableBodyCell>
                          <TableBodyCell>{dr.Status}</TableBodyCell>
                          <TableBodyCell>{new Date(dr.RequestDate).toISOString().slice(0, 10)}</TableBodyCell>
                          <TableBodyCell>
                            <Link href={`/division/requests/${dr.RequestID}`} passHref>
                              <IconButton size="small">
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Link>
                          </TableBodyCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </TabPanel>

            {/* --- Tab 2: سجل العمليات + إضافة تعليق --- */}
            <TabPanel value="2">
              <SectionTitle>سجل العمليات</SectionTitle>
              <ChatContainer variant="outlined">
                {history.length === 0 ? (
                  <Typography>لا توجد عمليات بعد.</Typography>
                ) : (
                  history.map((h, i) => (
                    <ChatBubble key={i} mine={h.ActionBy === actor}>
                      <strong>{h.ActionType}</strong>
                      {h.ActionNote && ` — ${h.ActionNote}`}
                      <br />
                      <small>
                        بواسطة {h.ActionBy} في {new Date(h.ActionDate).toLocaleString()}
                      </small>
                    </ChatBubble>
                  ))
                )}
                <div ref={chatEndRef} />
              </ChatContainer>

              <SectionTitle>إضافة تعليق</SectionTitle>
              <StyledForm onSubmit={handleComment}>
                <FullWidthTextField
                  multiline
                  minRows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب تعليقك هنا…"
                />
                <FullWidthButton type="submit" variant="contained" disabled={sending}>
                  {sending ? 'جاري الإرسال…' : 'إرسال التعليق'}
                </FullWidthButton>
              </StyledForm>
            </TabPanel>
          </DialogContent>
        </StyledTabContext>

        <DialogActions>
          <Button onClick={handleDetailClose}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* — Summon Dialog — */}
      <Dialog open={summonOpen} onClose={handleCloseSummon} fullWidth maxWidth="xs">
        <DialogTitle>استقدام الطلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          <Typography>هل تريد حقاً استقدام هذا الطلب للاستلام؟</Typography>
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

      {/* — Attachments Preview Dialog — */}
      <Dialog open={attachmentModalOpen} onClose={() => setAttachmentModalOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>معاينة المرفق</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 0 }}>
          {attachmentType === 'pdf' ? (
            <Box sx={{ width: '100%', height: '80vh' }}>
              <object data={attachmentUrl} type="application/pdf" width="100%" height="100%">
                <Typography sx={{ mt: 2 }}>
                  عذراً، المتصفح الحالي لا يدعم عرض ملفات PDF. يمكنك&nbsp;
                  <Button component="a" href={attachmentUrl} target="_blank" rel="noopener noreferrer" size="small">
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
          <Button onClick={handlePrintAttachment} variant="outlined" startIcon={<PictureAsPdfIcon />}>
            طباعة المرفق
          </Button>
          <Button onClick={() => setAttachmentModalOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* — Forward Modal — */}
      <Dialog open={forwardOpen} onClose={() => setForwardOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تحويل الطلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          {forwardList.map((row, idx) => {
            const emps = unitEmployeesMap[row.unitId as number] || [];
            return (
              <Box key={idx} sx={{ mb: 3 }}>
                {/* اختيار الوحدة */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>الوحدة</InputLabel>
                  <Select
                    value={row.unitId}
                    label="الوحدة"
                    onChange={(e) => {
                      const copy = [...forwardList];
                      copy[idx] = { unitId: +e.target.value, empRows: [] };
                      setForwardList(copy);
                    }}
                  >
                    <MenuItem value="">
                      <em>—</em>
                    </MenuItem>
                    {units.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* قائمة الموظفين للوحدة */}
                {emps.map((emp, idx2) => {
  const isChecked = forwardList[idx].empRows.some(er => er.id === emp.SectionEmployeeID);
  const note = forwardList[idx].empRows.find(er => er.id === emp.SectionEmployeeID)?.note || '';

  // نحدد ما إذا كان الموظف مُختارًا في أي صف آخر (صف غير idx):
  const isUsedElsewhere = forwardList.some((otherRow, otherIdx) => {
    return otherIdx !== idx && otherRow.empRows.some(er => er.id === emp.SectionEmployeeID);
  });

  return (
    <Box key={emp.SectionEmployeeID} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={isChecked}
            // إذا الموظف مُختار في صف آخر، نُعطّل هذا الاختيار:
            disabled={isUsedElsewhere}
            onChange={e => {
              const copy = [...forwardList];
              if (e.target.checked) {
                copy[idx].empRows.push({ id: emp.SectionEmployeeID, note: '' });
              } else {
                copy[idx].empRows = copy[idx].empRows.filter(
                  er => er.id !== emp.SectionEmployeeID
                );
              }
              setForwardList(copy);
            }}
          />
        }
        label={emp.FullName}
        sx={{ mr: 2 }}
      />

      {isChecked && (
        <TextField
          placeholder="ملاحظة"
          value={note}
          onChange={e => {
            const copy = [...forwardList];
            const target = copy[idx].empRows.find(
              er => er.id === emp.SectionEmployeeID
            )!;
            target.note = e.target.value;
            setForwardList(copy);
          }}
          sx={{ flex: 1, mr: 2 }}
        />
      )}
    </Box>
  );
})}

                <Button
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={() => removeForwardRow(idx)}
                >
                  حذف الوحدة
                </Button>
              </Box>
            );
          })}
          <Button startIcon={<AddIcon />} onClick={addForwardRow} sx={{ mt: 1 }}>
            إضافة وحدة
          </Button>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button onClick={() => setForwardOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={forwarding || forwardList.length === 0}
            onClick={handleForward}
          >
            {forwarding ? 'جاري التحويل…' : 'تحويل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* — Confirm Complete Dialog — */}
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
