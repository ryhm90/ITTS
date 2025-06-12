// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState, FormEvent, ChangeEvent, useCallback } from 'react';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PhotoIcon from '@mui/icons-material/Photo';
import DeleteIcon from '@mui/icons-material/Delete';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Grid,
  Link,
  Card,
  CardMedia,
  CardContent,

  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Snackbar,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  TablePagination
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import EditIcon       from '@mui/icons-material/Edit';
import CancelIcon     from '@mui/icons-material/Cancel';
import CheckIcon      from '@mui/icons-material/Check';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon       from '@mui/icons-material/Code';
import BuildIcon      from '@mui/icons-material/Build';
import MoreHorizIcon  from '@mui/icons-material/MoreHoriz';
import PrintIcon      from '@mui/icons-material/Print';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DatePicker }         from '@mui/x-date-pickers/DatePicker';
import 'dayjs/locale/ar';
import {  TextFieldProps } from '@mui/material';
import CalendarTodayIcon      from '@mui/icons-material/CalendarToday';
import InputAdornment         from '@mui/material/InputAdornment';

//
// Interfaces
//
interface RequestItem {
  RequestID:   number;
  Title:       string;
  Status:      string;
  RequestDate: string;
  deviceId:    number;
  deviceNo:    number;
  deviceType:  string;
  deviceDesc?: string;
  service:     string;
}

interface HistoryItem {
  ActionBy:   string;
  ActionType: string;
  ActionNote?: string;
  ActionDate: string;
}

// Used inside NewRequestDialog:
interface Device {
  id:               number;
  noDv:             number;
  caseDesc:         string;
  typeName:         string;
  descriptionName:  string;
}

interface UserContext {
  division:   { id: number };
  department: { id: number };
  section:    { id: number };
}

type CategoryKey = 'software' | 'maintenance' | 'other';

const categories: Record<CategoryKey, { label: string; icon: React.ReactNode; services: string[] }> = {
  software: {
    label: 'خدمات برمجيّة',
    icon: <CodeIcon color="primary" />,
    services: ['أجهزة البصمة', 'الموقع الألكتروني', 'تحديث نظام برمجي'],
  },
  maintenance: {
    label: 'خدمات صيانة',
    icon: <BuildIcon color="primary" />,
    services: ['صيانة الحاسبات وملحقاتها', 'صيانة الطابعات وملحقاتها', 'صيانة أجهزة الاستنساخ', 'صيانة كاميرات المراقبة'],
  },
  other: {
    label: 'خدمات أخرى',
    icon: <MoreHorizIcon color="primary" />,
    services: ['الأرشفة', 'مضاد الفايروسات'],
  },
};

//
// Main Dashboard Component
//
export default function Dashboard() {
 const router         = useRouter();
 const searchParams   = useSearchParams();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Dialog states
  const [newOpen, setNewOpen]       = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Evaluate dialog (replaces old AcknowledgeDialog)
  const [evaluateOpen, setEvaluateOpen] = useState(false);

  const [currentId, setCurrentId]       = useState<number | null>(null);
  const [viewOpen, setViewOpen]         = useState(false);

  // History dialog data
  const [viewHistory, setViewHistory]   = useState<HistoryItem[]>([]);
  const [viewLoading, setViewLoading]   = useState(false);
  const [viewComment, setViewComment]   = useState('');
  const [viewSending, setViewSending]   = useState(false);
  const [viewStatus, setViewStatus]     = useState<string>('');
  const [commentSubmitted, setCommentSubmitted] = useState(false); // ← حالة جديدة
  // ===== pagination states =====
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);      // الصفحة الحالية (1-based)
  const [pageSize, setPageSize] = useState(10);     // عدد الصفوف في الصفحة
  const [loading, setLoading]   = useState(false);


  // Disallow “طلب جديد” if there is any completed (تم الإنجاز) request awaiting evaluation
  const hasCompleted = requests.some(r => r.Status === 'تم الإنجاز');
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests?page=${page}&pageSize=${pageSize}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // نتوقع شكل { items: RequestItem[], total: number }
      const items = Array.isArray(data.items) ? data.items : data.data || data;
      setRequests(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
    } catch {
      setSnackbar({ message: 'فشل في جلب الطلبات', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ===== handlers =====
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage + 1); // TablePagination يعطي 0-based
  };
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(e.target.value, 10));
    setPage(1);
  };

  const handleViewHistory = async (id: number) => {
    setCurrentId(id);
    setViewOpen(true);
    setViewLoading(true);

    const reqItem = requests.find(r => r.RequestID === id);
    setViewStatus(reqItem?.Status || '');

    try {
      const res = await fetch(`/api/requests/${id}/history`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const all: HistoryItem[] = await res.json();
      setViewHistory(all.filter(h => h.ActionType !== 'تعليق'));
    } catch {
      setSnackbar({ message: 'فشل في جلب سجل العمليات', severity: 'error' });
    } finally {
      setViewLoading(false);
    }
  };

  const handleError = useCallback((msg: string) => {
    setSnackbar({ message: msg, severity: 'error' });
  }, []);

  // Fetch all requests
 

  // Handle printing the apology
  const handlePrintApology = (id: number) => {
    window.open(`/api/requests/${id}/print-apology`, '_blank');
  };

  const handleAddComment = async () => {
    if (!currentId) return;
    setViewSending(true);
    try {
      const res = await fetch(`/api/requests/${currentId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: viewComment.trim() }),
      });
      if (!res.ok) throw await res.json();
      setViewComment('');
      setCommentSubmitted(true); // ← نجح، نخفي الزر
      // نعيد جلب التاريخ المحدث:
      const hres = await fetch(`/api/requests/${currentId}/history`, { credentials: 'include' });
      if (hres.ok) {
        const all: HistoryItem[] = await hres.json();
        setViewHistory(all.filter(h => h.ActionType !== 'تعليق'));
      }
    } catch (err: any) {
      // عرض رسالة خطأ...
    } finally {
      setViewSending(false);
    }
  };
   // 2) إذا جاءنا query ?viewHistory=xyz فنشغّل handleViewHistory تلقائياً
 React.useEffect(() => {
   const vid = searchParams.get('viewHistory');
   if (vid) {
     handleViewHistory(Number(vid));
     // نظيف replace حتى نحذف الـ param من الـ URL
     router.replace('/dashboard', { scroll: false });
   }
 }, [searchParams, router]);
  return (
    <Box sx={{ p: { xs: 2, md: 6 } }}>

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4
        }}
      >
        <Typography variant="h4" color="primary">
          لوحة التحكم
        </Typography>
        <Button
          color="secondary"
          sx={{ fontSize: 15 }}
          variant="contained"
          endIcon={<AddIcon sx={{ mr: 1 }} />}
          onClick={() => {
            if (hasCompleted) {
              setSnackbar({
                message: 'لا يمكنك تقديم طلب جديد حتى يتم تقييم الإنجازات المكتملة.',
                severity: 'error'
              });
            } else {
              setNewOpen(true);
            }
          }}
        >
          تقديم طلب جديد
        </Button>
      </Box>

      {/* Requests Table */}
      <Paper>
        <Table>
          <TableHead
            sx={{
              bgcolor: 'primary.light',
              '& .MuiTableCell-root': {
                color: 'common.white',
                fontWeight: 'bold',
                fontSize: 16,
              }
            }}
          >
            <TableRow>
              {['رقم الطلب', 'الموضوع', 'التاريخ', 'الخدمة', 'الحالة', 'الجهاز', 'إجراءات'].map((lbl) => (
                <TableCell key={lbl} align="center" sx={{ fontWeight: '600', fontSize: 16 }}>
                  {lbl}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {requests.map(req => (
              <TableRow key={req.RequestID} hover>
                <TableCell align="center">{req.RequestID}</TableCell>
                <TableCell align="center">{req.Title}</TableCell>
                <TableCell align="center">{req.RequestDate.slice(0,10)}</TableCell>
                <TableCell align="center">{req.service}</TableCell>
                <TableCell align="center">{req.Status}</TableCell>
                <TableCell align="center">
                  {req.deviceType} #{req.deviceNo}
                </TableCell>
                <TableCell align="center">
                  {/* View History */}
                  <Tooltip title="مشاهدة سجل العمليات">
                  <IconButton onClick={() => handleViewHistory(req.RequestID)}>
                    <VisibilityIcon />
                  </IconButton>
</Tooltip>
                  {/* Edit and Cancel */}
                  {['قيد الإستلام', 'استلم'].includes(req.Status) && (
                    <>
                    <Tooltip title="تعديل الطلب">

                      <IconButton
                        color="secondary"
                        sx={{ mx: 0.5 }}
                        onClick={() => {
                          setCurrentId(req.RequestID);
                          setEditOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      </Tooltip>
                      <Tooltip title="الغاء الطلب">
                      <IconButton
                        color="error"
                        sx={{ mx: 0.5 }}
                        onClick={() => {
                          setCurrentId(req.RequestID);
                          setCancelOpen(true);
                        }}
                      >
                        <CancelIcon />
                      </IconButton>
                      </Tooltip>
                    </>
                  )}

                  {/* Evaluate */}
                  {req.Status === 'تم الإنجاز' && (
                  <Tooltip title="تم الانجاز">

                    <IconButton
                      color="success"
                      sx={{ mx: 0.5 }}
                      onClick={() => {
                        setCurrentId(req.RequestID);
                        setEvaluateOpen(true);
                      }}
                    >
                      <CheckIcon />
                    </IconButton>
                    </Tooltip>
                  )}

                  {/* Print Apology */}
                  {req.Status === 'اعتذار' && (
                      <Tooltip title="طباعة الاعتذار">

                    <IconButton
                      aria-label="طباعة الاعتذار"
                      color="primary"
                      sx={{ mx: 0.5 }}
                      onClick={() => handlePrintApology(req.RequestID)}
                    >
                      <PrintIcon />
                    </IconButton>
                     </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* ===== Pagination ===== */}
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={handleChangePage}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} من ${count}`
          }
        />
      </Paper>

      {/* — New Request Dialog — */}
      <NewRequestDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => {
          setNewOpen(false);
          fetchRequests();
          setSnackbar({ message: 'تم إرسال الطلب', severity: 'success' });
        }}
        onError={handleError}
      />

      {/* — Edit Request Dialog — */}
      {currentId != null && (
        <EditRequestDialog
          open={editOpen}
          id={currentId}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            fetchRequests();
            setSnackbar({ message: 'تم حفظ التعديلات', severity: 'success' });
          }}
          onError={msg => setSnackbar({ message: msg, severity: 'error' })}
        />
      )}

      {/* — Cancel Confirmation — */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth>
        <DialogTitle>إلغاء الطلب #{currentId}</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من إلغاء هذا الطلب؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!currentId) return;
              const res = await fetch(`/api/requests/${currentId}`, {
                method: 'DELETE',
                credentials: 'include',
              });
              if (res.ok) {
                setSnackbar({ message: 'تم إلغاء الطلب', severity: 'success' });
                fetchRequests();
              } else {
                const { error } = await res.json().catch(() => ({}));
                setSnackbar({ message: error || 'فشل الإلغاء', severity: 'error' });
              }
              setCancelOpen(false);
            }}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      {/* — Evaluate Dialog — */}
      {currentId != null && (
        <EvaluateDialog
          open={evaluateOpen}
          requestId={currentId}
          onClose={() => setEvaluateOpen(false)}
          onSuccess={() => {
            setEvaluateOpen(false);
            fetchRequests();
            setSnackbar({ message: 'تم حفظ التقييم بنجاح', severity: 'success' });
          }}
          onError={msg => setSnackbar({ message: msg, severity: 'error' })}
        />
      )}

      {/* — View History Dialog — */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>سجل العمليات</DialogTitle>
        <DialogContent dividers>
          {viewLoading ? (
            <Typography>جاري التحميل…</Typography>
          ) : viewHistory.length === 0 ? (
            <Typography>لا توجد عمليات.</Typography>
          ) : (
            viewHistory.map((h, i) => (
              <Box key={i} sx={{ p: 1, my: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography>
                  <strong>{h.ActionType}</strong>
                  {h.ActionNote && ` — ${h.ActionNote}`}
                </Typography>
                <Typography variant="caption">
                  بواسطة {h.ActionBy} في {new Date(h.ActionDate).toLocaleString()}
                </Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1 }}>
          {viewStatus === 'معلق' && (
            <>
              <TextField
                fullWidth
                multiline
                minRows={2}
                value={viewComment}
                onChange={e => setViewComment(e.target.value)}
                placeholder="اكتب تعليقك هنا…"
              />
              <Button
            fullWidth
            variant="contained"
            disabled={!viewComment.trim() || viewSending}
            onClick={handleAddComment}
            sx={{ mt: 1 }}
          >
            {viewSending ? 'جاري الإرسال…' : 'إرسال تعليق'}
          </Button>
            </>
          )}
          <Button fullWidth onClick={() => setViewOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* — Snackbar — */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

//
// EvaluateDialog Component
//
interface EvaluateDialogProps {
  open:       boolean;
  requestId:  number;
  onClose():  void;
  onSuccess(): void;
  onError(msg: string): void;
}

function EvaluateDialog({ open, requestId, onClose, onSuccess, onError }: EvaluateDialogProps) {
  const [accuracy, setAccuracy] = useState<number>(0);
  const [speed, setSpeed]       = useState<number>(0);
  const [behavior, setBehavior] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const ratingOptions = [
    { value: 5, label: 'ممتاز' },
    { value: 4, label: 'جيد جداً' },
    { value: 3, label: 'جيد' },
    { value: 2, label: 'متوسط' },
    { value: 1, label: 'مقبول' },
    { value: 0, label: 'ضعيف' },
  ];

  const handleSubmit = async () => {
    if (![accuracy, speed, behavior].every(n => Number.isInteger(n) && n >= 1 && n <= 5)) {
      onError('الرجاء اختيار تقييم (1 إلى 5) لكل معيار');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accuracy, speed, behavior, comments }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      
      onSuccess();
    } catch (e: any) {
      console.error(e);
      onError(e.message || 'فشل في إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>تقييم إنجاز الطلب #{requestId}</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>دقة إنجاز العملية</InputLabel>
            <Select
              value={accuracy}
              label="دقة إنجاز العملية"
              onChange={e => setAccuracy(Number(e.target.value))}
            >
              <MenuItem value=""><em>— اختر التقييم —</em></MenuItem>
              {ratingOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>سرعة إنجاز العملية</InputLabel>
            <Select
              value={speed}
              label="سرعة إنجاز العملية"
              onChange={e => setSpeed(Number(e.target.value))}
            >
              <MenuItem value=""><em>— اختر التقييم —</em></MenuItem>
              {ratingOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>أسلوب تعامل الموظف</InputLabel>
            <Select
              value={behavior}
              label="أسلوب تعامل الموظف"
              onChange={e => setBehavior(Number(e.target.value))}
            >
              <MenuItem value=""><em>— اختر التقييم —</em></MenuItem>
              {ratingOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="أيّة ملاحظات أو مقترحات أخرى"
            multiline
            minRows={3}
            fullWidth
            value={comments}
            onChange={e => setComments(e.target.value)}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          color="secondary"
        >
          {submitting ? 'جاري الحفظ…' : 'حفظ التقييم'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

//
// NewRequestDialog Component
//
interface NewRequestDialogProps {
  open:      boolean;
  onClose(): void;
  onSuccess(): void;
  onError(msg: string): void;
}

function NewRequestDialog({ open, onClose, onSuccess, onError }: NewRequestDialogProps) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [ctx, setCtx]                 = useState<UserContext | null>(null);
  const [activeStep, setActiveStep]   = useState(0);
  const [memoID, setMemoID]           = useState('');
  const [memoDate, setMemoDate]       = useState<string>('');
  const [TypeIDC, setTypeIDC]         = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const [devices, setDevices]         = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);

  // هنا نخزّن الملفات الفعليّة (صور + PDF)
  const [files, setFiles] = useState<File[]>([]);
  // لتخزين معاينات الصور بصيغة Data URL:
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // لتخزين Blob URL لملفات PDF:
  const [pdfPreviews, setPdfPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setCtx(data);
      })
      .catch(() => {});
  }, []);

  // Fetch devices whenever service changes
  useEffect(() => {
    if (!selectedService || !ctx) {
      setDevices([]);
      setSelectedDevice(null);
      return;
    }

    let typeId: number;
    switch (selectedService) {
      case 'أجهزة البصمة':
        typeId = 6;
        break;
      case 'صيانة الطابعات وملحقاتها':
        typeId = 2;
        break;
      case 'صيانة الحاسبات وملحقاتها':
        typeId = 1;
        break;
      default:
        typeId = 0;
    }
    setTypeIDC(typeId);

    const params = new URLSearchParams({
      typeId:       String(typeId),
      divisionId:   String(ctx.division.id),
      departmentId: String(ctx.department.id),
      sectionId:    String(ctx.section.id),
    });

    fetch(`/api/devices?${params}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setDevices)
      .catch(() => onError('فشل في جلب الأجهزة'));

    setSelectedDevice(null);
  }, [selectedService, ctx, onError]);

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCategory(null);
    setSelectedService(null);
  };
  const handleBack = () => {
    if (activeStep === 2) {
      setSelectedService(null);
      setDevices([]);
    }
    setActiveStep(prev => prev - 1);
  };

  // --------------- معالجة رفع الملفات + المعاينات ---------------
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (file.size > 2 * 1024 * 1024) { // 2 ميغابايت
        onError(`حجم الملف "${file.name}" أكبر من 2 ميغا بايت.`);
        continue;
      }
      validFiles.push(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
setImagePreviews(prev => [...prev, result])          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        const blobUrl = URL.createObjectURL(file);
        setPdfPreviews(prev => [...prev, blobUrl]);
      }
    }

    setFiles(prev => [...prev, ...validFiles]);
  };
// حذف ملف معين من preview
  const handleRemovePreview = (idx: number, type: 'image' | 'pdf') => {
    if (type === 'image') {
      setImagePreviews(prev => prev.filter((_, i) => i !== idx));
      setFiles(prev => prev.filter((_, i) => i !== idx));
    } else {
      setPdfPreviews(prev => prev.filter((_, i) => i !== idx));
      // ملفات PDF تأتي بعد الصور في المصفوفة files؛ نفترض أنها جميعاً في آخر المصفوفة
      setFiles(prev => {
        const imageCount = imagePreviews.length;
        return prev.filter((_, i) => i < imageCount || i !== imageCount + idx);
      });
    }
  };
  // --------------- إرسال النموذج ---------------
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // نتأكد من تعبئة الحقول الأساسية
    if (!title || !description || !memoID || !memoDate || !selectedService || !selectedDevice) {
      return onError('يرجى تعبئة جميع الحقول الضرورية واختيار خدمة وجهاز');
    }

    setUploading(true);

    // نحضّر FormData لإرسال الحقول + الملفات
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('service', selectedService);
    formData.append('deviceId', String(selectedDevice));
    formData.append('memoID', memoID);
    formData.append('memoDate', memoDate);

    // نضيف جميع الملفات تحت المفتاح "attachments"
    files.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || 'فشل في إرسال الطلب');
      }
      onSuccess();

      // نفرّغ كافة الحقول والمعاينات عند النجاح
      setTitle('');
      setDescription('');
      setMemoID('');
      setMemoDate('');
      setSelectedCategory(null);
      setSelectedService(null);
      setDevices([]);
      setSelectedDevice(null);
      setFiles([]);
      setImagePreviews([]);
      setPdfPreviews([]);
      setActiveStep(0);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setUploading(false);
    }
  };
 const resetPreviews = () => {
    setFiles([]);
    setImagePreviews([]);
    setPdfPreviews([]);
  };

  // عند إغلاق الحوار نصفر المعاينات
  const handleClose = () => {
    resetPreviews();
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>تقديم طلب جديد</DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {/* رقم المذكرة */}
          <TextField
            label="رقم المذكرة"
            fullWidth
            required
            type="number"
            value={memoID}
            onChange={e => setMemoID(e.target.value)}
          />

          {/* تاريخ المذكرة */}
          <TextField
            label="تاريخ المذكرة"
            type="date"
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            value={memoDate}
            onChange={e => setMemoDate(e.target.value)}
          />

          {/* الموضوع */}
          <TextField
            label="الموضوع"
            fullWidth
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          {/* تفاصيل الطلب */}
          <TextField
            label="تفاصيل الطلب"
            fullWidth
            required
            multiline
            minRows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* خطوة اختيار الفئة → الخدمة → الجهاز */}
          <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {/* STEP 0: الفئة */}
              <Step>
                <StepLabel>نوع الخدمة</StepLabel>
                <StepContent>
                  <List disablePadding>
                    {(Object.keys(categories) as CategoryKey[]).map(key => (
                      <ListItemButton
                        key={key}
                        onClick={() => {
                          setSelectedCategory(key);
                          setActiveStep(1);
                        }}
                      >
                        {categories[key].icon}
                        <ListItemText primary={categories[key].label} />
                      </ListItemButton>
                    ))}
                  </List>
                </StepContent>
              </Step>

              {/* STEP 1: الخدمة */}
              <Step>
                <StepLabel>
                  {selectedCategory
                    ? categories[selectedCategory].label
                    : 'اختر الفئة أولاً'}
                </StepLabel>
                <StepContent>
                  {selectedCategory && (
                    <List disablePadding>
                      {categories[selectedCategory].services.map(svc => (
                        <ListItemButton
                          key={svc}
                          onClick={() => {
                            setSelectedService(svc);
                            setActiveStep(2);
                          }}
                        >
                          <ListItemText primary={svc} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Button disabled={activeStep === 0} onClick={() => setActiveStep(0)}>
                      السابق
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* STEP 2: الأجهزة */}
              <Step>
                <StepLabel>{selectedService ?? 'اختر الخدمة أولاً'}</StepLabel>
                <StepContent>
                  {selectedService ? (
                    <>
                      <Typography gutterBottom>
                        الأجهزة المتوفرة لخدمة “{selectedService}”:
                      </Typography>
                      <FormControl component="fieldset">
                        <RadioGroup
                          value={selectedDevice ?? ''}
                          onChange={e => setSelectedDevice(Number(e.target.value))}
                        >
                          {devices.map(d => (
                            <FormControlLabel
                              key={d.id}
                              value={d.id}
                              control={<Radio />}
                              label={`#${d.noDv} — ${d.typeName} - ${d.descriptionName}`}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </>
                  ) : (
                    <Typography color="text.secondary">لم تختَر خدمة بعد.</Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Button onClick={handleBack} sx={{ mr: 1 }}>
                      السابق
                    </Button>
                    <Button onClick={handleReset}>إعادة الاختيار</Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </Box>

          {/* رفع ملفات (صور أو PDF) */}
          <Button variant="outlined" component="label">
           ارفاق صورة او PDF المذكرة
            <input
              hidden
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />
          </Button>

           {/* عرض معاينات الصور وملفات PDF في شبكة */}
          <Grid container spacing={2}>
        {imagePreviews.map((src, idx) => (
          <Box
            key={`img-${idx}`}
            sx={{
              width: 80,
              height: 100,
              position: 'relative',
              border: '1px solid #ccc',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Box
              onClick={() => window.open(src, '_blank')}
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#fafafa',
                cursor: 'pointer'
              }}
            >
              <PhotoIcon fontSize="large" color="primary" />
            </Box>
            <IconButton
              size="small"
              onClick={() => handleRemovePreview(idx, 'image')}
              sx={{
                position: 'absolute',
                top: 2, left: 2,
                bgcolor: 'rgba(255,255,255,0.7)'
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="caption"
              noWrap
              sx={{ position: 'absolute', bottom: 2, left: 2 }}
            >
              صورة #{idx + 1}
            </Typography>
          </Box>
        ))}

        {pdfPreviews.map((blobUrl, idx) => (
          <Box
            key={`pdf-${idx}`}
            sx={{
              width: 80,
              height: 100,
              position: 'relative',
              border: '1px solid #ccc',
              borderRadius: 1,
            }}
          >
            <Box
              onClick={() => window.open(blobUrl, '_blank')}
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#fafafa',
                cursor: 'pointer'
              }}
            >
              <PictureAsPdfIcon fontSize="large" color="error" />
            </Box>
            <IconButton
              size="small"
              onClick={() => handleRemovePreview(idx, 'pdf')}
              sx={{
                position: 'absolute',
                top: 2, left: 2,
                bgcolor: 'rgba(255,255,255,0.7)'
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="caption"
              noWrap
              sx={{ position: 'absolute', bottom: 2, left: 2 }}
            >
              PDF #{idx + 1}
            </Typography>
          </Box>
        ))}
      </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>إلغاء</Button>
        <Button
          type="submit"
          disabled={uploading || files.length === 0}
          variant="contained"
          color="secondary"
          onClick={handleSubmit}
        >
          {uploading ? 'جارٍ الإرسال…' : 'إرسال'}
        </Button>

      </DialogActions>
    </Dialog>
  );
}


//
// EditRequestDialog Component
//
interface EditProps {
  open:      boolean;
  id:        number;
  onClose(): void;
  onSuccess(): void;
  onError(msg: string): void;
}

function EditRequestDialog({ open, id, onClose, onSuccess, onError }: EditProps) {
  const [title, setTitle]             = useState('');

  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setLoading(true);

    fetch(`/api/requests/${id}`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => {
        if (!isMounted) return;
        if (!data) {
          onError('الطلب غير موجود');
          onClose();
        } else {
          setTitle(data.Title);
          setDescription(data.Description || '');
        }
      })
      .catch(() => {
        if (isMounted) {
          onError('فشل جلب بيانات الطلب');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, open, onError, onClose]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const { error } = await res.json().catch(() => ({}));
        onError(error || 'فشل حفظ التعديلات');
      }
    } catch {
      onError('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (!open || loading) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>تعديل الطلب #{id}</DialogTitle>
      <DialogContent dividers>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="الموضوع"
            fullWidth
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <TextField
            label="تفاصيل الطلب"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          color="primary"
        >
          {saving ? 'جاري الحفظ…' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
