// src/app/division/dashboard/page.tsx
'use client';

import React, { useRef, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { TabPanel } from '@mui/lab';
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
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
  memoID: string;
  memoDate: string;
  ImageUrls: string;
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
  unit?:ContextItem
}

type ForwardRow = {
  unitId: number | '';
  empRows: { id: number; name: string ,note: string }[];
};

export default function DivisionDashboard() {
  // — قائمة الطلبات مع pagination —
  const [requests, setRequests] = useState<DivisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Snackbar عام
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'error' | 'success' } | null>(null);

  // — تفاصيل الطلب —
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequest[]>([]);
  const [assignedEmpIds, setAssignedEmpIds] = useState<number[]>([]);

  // تبويبات
  const [detailTab, setDetailTab] = useState<'0' | '1' | '2'>('0');

  // تعليق
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  // المستخدم الحالي
  const [user, setUser] = useState<DecodedToken | null>(null);
  const pathname = usePathname();

  // تأكيد الإنجاز
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const handleOpenComplete = () => setCompleteOpen(true);
  const handleCloseComplete = () => setCompleteOpen(false);

  // استقدام للاستلام
  const [summonOpen, setSummonOpen] = useState(false);
  const [summoning, setSummoning] = useState(false);
  const handleOpenSummon = () => setSummonOpen(true);
  const handleCloseSummon = () => setSummonOpen(false);

  // نافذة التحويل
  const [forwardOpen, setForwardOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitEmployeesMap, setUnitEmployeesMap] = useState<Record<number, Employee[]>>({});
  const [forwardList, setForwardList] = useState<ForwardRow[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router       = useRouter();
  const searchParams = useSearchParams();

  // تحميل قائمة الطلبات مع pagination
  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/unit/requests?page=${page}&pageSize=${pageSize}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      // نتأكد من أن data.items أو data أو data.data هو المصفوفة
      const items: DivisionRequest[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];
      setRequests(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
    } catch {
      setSnackbar({ message: 'فشل في جلب طلبات الوحدة', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [page, pageSize]);

  // جلب بيانات المستخدم الحالي
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        setUser(res.ok ? data : null);
      } catch {
        setUser(null);
      }
    })();
  }, [pathname]);

  // فتح تفاصيل الطلب
  const handleView = async (id: number) => {
    setSelectedReqId(id);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const [reqRes, histRes, sameRes] = await Promise.all([
        fetch(`/api/unit/requests/${id}`, { credentials: 'include' }),
        fetch(`/api/admin/requests/${id}/history`, { credentials: 'include' }),
        fetch(`/api/unit/requests?deviceId=${id}`, { credentials: 'include' }),
      ]);

      if (reqRes.ok) setDetail(await reqRes.json());
      if (histRes.ok) setHistory(await histRes.json());
      if (sameRes.ok) {
        const sameData = await sameRes.json();
        // تأكد أن sameData هو مصفوفة
        const sameItems: DeviceRequest[] = Array.isArray(sameData)
          ? sameData
          : Array.isArray(sameData.items)
          ? sameData.items
          : [];
        setDeviceRequests(sameItems);
      }
 
    } catch {
      showToast({ type: 'error', message: 'فشل في تحميل التفاصيل' });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // إغلاق تفاصيل الطلب
  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailTab('0');
    setSelectedReqId(null);
    setDetail(null);
    setHistory([]);
    setDeviceRequests([]);
    setForwardList([]);
    setComment('');
    setAssignedEmpIds([]);
  };

  // إضافة تعليق
  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !selectedReqId) {
      showToast({ type: 'error', message: 'اكتب تعليقًا أولاً' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/unit/requests/${selectedReqId}/comment`, {
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

  // تأكيد الإنجاز
  const handleConfirmComplete = async () => {
    if (!selectedReqId) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/unit/requests/${selectedReqId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await res.json();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تغير حالة',
        }),
      });
      showToast({ type: 'success', message: 'تم تأكيد الإنجاز' });
      handleCloseComplete();
      handleDetailClose();
      // إعادة تحميل قائمة الطلبات
      await loadRequests();
    } catch (err: any) {
      showToast({ type: 'error', message: err.error || 'فشل في تأكيد الإنجاز' });
    } finally {
      setCompleting(false);
    }
  };

  // تأكيد الاستقدام للاستلام
  const handleConfirmSummon = async () => {
    if (!selectedReqId) return;
    setSummoning(true);
    try {
      const res = await fetch(`/api/unit/requests/${selectedReqId}/summon`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw await res.json();
      await fetch(`/api/admin/requests/${selectedReqId}/historyn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actionType: 'تغير حالة',
        }),
      });
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



  // إرسال التحويل
  const actor = `${user?.role} - ${user?.unit?.name} - ${user?.name}`;
// إذا جاءنا ?viewRequest=85، نفتح التفاصيل لذلك الطلب
  useEffect(() => {
    const vr = searchParams.get('viewRequest');
    if (vr) {
      const id = Number(vr);
      if (!isNaN(id)) {
        handleView(id);
        // ننظف الـ query من الـ URL
        router.replace('/unit/dashboard', { scroll: false });
      }
    }
  }, [searchParams, router]);
  
    const [drPage, setDrPage] = useState(0);
  const [drRowsPerPage, setDrRowsPerPage] = useState(5);
  
  // 2) معالجات تغيير الصفحة وعدد الصفوف:
  const handleDrChangePage = (_: unknown, newPage: number) => {
    setDrPage(newPage);
  };
  const handleDrChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDrRowsPerPage(parseInt(e.target.value, 10));
    setDrPage(0);
  };
  
  return (
    <PageContainer>
      <HeaderRow>
        <PageTitle>طلبات الوحدة</PageTitle>
      </HeaderRow>

      {!loading && requests.length === 0 && (
        <Typography align="center" color="text.secondary">
          لا توجد طلبات حاليًا.
        </Typography>
      )}

      {!loading && requests.length > 0 && (
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
                  <TableBodyCell>
                    {new Date(r.RequestDate).toISOString().slice(0, 10)}
                  </TableBodyCell>
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
            page={page - 1} // 0-based index
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

      {/* — تفاصيل الطلب مع التبويبات — */}
      <Dialog open={detailOpen} onClose={handleDetailClose} fullWidth maxWidth="md">
        <DialogTitle>تفاصيل الطلب #{detail?.RequestID}</DialogTitle>
        <StyledTabContext value={detailTab}>
          <StyledTabList onChange={(_, v) => setDetailTab(v)}>
            <StyledTab label="التفاصيل" value="0" />
            <StyledTab label="طلبات بنفس الجهاز" value="1" />
            <StyledTab label="سجل العمليات" value="2" />
          </StyledTabList>
          <DialogContent>
            {/* تبويب 0: التفاصيل */}
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
                    <strong>تاريخ المذكرة:</strong>{' '}
                    {detail.memoDate ? detail.memoDate.slice(0, 10) : ''}
                  </Typography>
                  <Typography>
                    <strong>الموضوع:</strong> {detail.Title}
                  </Typography>
                  <Typography>
                    <strong>الوصف:</strong> {detail.Description}
                  </Typography>
                  <Typography>
                    <strong>تاريخ الطلب:</strong>{' '}
                    {new Date(detail.RequestDate).toISOString().slice(0, 10)}
                  </Typography>
                  <Typography>
                    <strong>الحالة:</strong> {detail.Status}
                  </Typography>
                  <Typography>
                    <strong>الهيكل الهرمي:</strong>
                    <br />
                    {detail.divisionName} &gt; {detail.departmentName} &gt;{' '}
                    {detail.sectionName}
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
                                onClick={() => window.open(trimmed, '_blank')}
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
                              onClick={() => window.open(trimmed, '_blank')}
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

                  {/* أزرار الإجراء */}
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
                      color="info"
                      onClick={handleOpenSummon}
                      disabled={!detail || detail.Status !== 'تم التوجيه'}
                      sx={{ ml: 1 }}
                    >
                      استقدام للاستلام
                      {summoning && '…'}
                    </Button>

                  </Box>
                </>
              )}
            </TabPanel>

            {/* تبويب 1: طلبات بنفس الجهاز */}
            <TabPanel value="1">
              {deviceRequests.length === 0 ? (
                <Typography>لا توجد طلبات أخرى لنفس الجهاز او الخدمة.</Typography>
              ) : (
                <>
                  <SectionTitle>طلبات بنفس الجهاز او الخدمة</SectionTitle>
                  <Table size="small">
        <TableHead>
          <TableRow>
            {['#', 'الموضوع', 'الخدمة', 'الحالة', 'التاريخ', 'إجراء'].map(h => (
              <TableHeaderCell key={h}>{h}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <tbody>
          {deviceRequests
            .slice(drPage * drRowsPerPage, drPage * drRowsPerPage + drRowsPerPage)
            .map(dr => (
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

      {/* 4) إضافة TablePagination لطلبات الجهاز */}
      <TablePagination
        component="div"
        count={deviceRequests.length}
        page={drPage}
        onPageChange={handleDrChangePage}
        rowsPerPage={drRowsPerPage}
        onRowsPerPageChange={handleDrChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        labelRowsPerPage="عدد الصفوف:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
      />
    </>
  )}
</TabPanel>

            {/* تبويب 2: سجل العمليات + إضافة تعليق */}
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
                        بواسطة {h.ActionBy} في{' '}
                        {new Date(h.ActionDate).toLocaleString()}
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
                <FullWidthButton
                  type="submit"
                  variant="contained"
                  disabled={sending}
                >
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


      {/* نافذة تأكيد الإنجاز */}
      <Dialog open={completeOpen} onClose={handleCloseComplete} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد إنجاز الطلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          <Typography>هل تريد حقًا تأكيد إنجاز هذا الطلب؟</Typography>
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

      {/* نافذة تأكيد الاستقدام */}
      <Dialog open={summonOpen} onClose={handleCloseSummon} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد استقدام الطلب #{selectedReqId}</DialogTitle>
        <DialogContent>
          <Typography>هل تريد حقًا استقدام هذا الطلب للاستلام؟</Typography>
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

      {/* Snackbar عام */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
