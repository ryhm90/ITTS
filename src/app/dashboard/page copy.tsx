// src/app/dashboard/page.tsx
'use client';

import React, {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
  JSX,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import { useCallback } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';

// ———————————————————————————————————————————————————————————————————
// Main Dashboard
// ———————————————————————————————————————————————————————————————————

interface RequestItem {
  RequestID:   number;
  Title:       string;
  Status:      string;
  RequestDate: string;
  deviceId:    number;
  deviceNo:    number;
  deviceType:  string;
  deviceDesc?: string;
}

interface HistoryItem {
  ActionBy: string;
  ActionType: string;
  ActionNote?: string;
  ActionDate: string;
}

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  // Dialog state
  const [newOpen, setNewOpen]           = useState(false);
  const [editOpen, setEditOpen]         = useState(false);
  const [cancelOpen, setCancelOpen]     = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [currentId, setCurrentId]       = useState<number | null>(null);
const [viewOpen, setViewOpen] = useState(false);
  const [viewHistory, setViewHistory] = useState<HistoryItem[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewComment, setViewComment] = useState('');
  const [viewSending, setViewSending] = useState(false);
  const [viewStatus, setViewStatus] = useState<string>('');
  const router = useRouter();

  const handleViewHistory = async (id: number) => {
    setCurrentId(id);
    setViewOpen(true);
    setViewLoading(true);
    // pull the request status from your existing list
    const req = requests.find(r => r.RequestID === id);
    setViewStatus(req?.Status || '');
    try {
      const res = await fetch(`/api/requests/${id}/history`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const all: HistoryItem[] = await res.json();
      // exclude comments (ActionType === 'تعليق')
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
  const refresh = () => {
    fetch('/api/requests', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setRequests)
      .catch(() =>
        setSnackbar({ message: 'فشل في جلب الطلبات', severity: 'error' })
      );
  };

  useEffect(refresh, []);

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
          sx={{fontSize:15}}
          variant="contained"
          endIcon={<AddIcon sx={{mr:1}}/>}
          onClick={() => setNewOpen(true)}
          
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
      color: 'common.white',     // أو 'white'
      fontWeight: 'bold',
      fontSize: 16,              // إذا أردت تغيير حجم الخط
    }
  }}
><TableRow>
            {['رقم الطلب', 'الموضوع', 'التاريخ', 'الحالة', 'الجهاز', 'إجراءات'].map((lbl) => (
              <TableCell  key={lbl} align='center' sx={{ fontWeight: '600',fontSize: 16, }}>
                {lbl}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map(req => (
            <TableRow key={req.RequestID} hover>
              <TableCell align='center' sx={{ fontSize: 15, }}>{req.RequestID}</TableCell>
              <TableCell align='center' sx={{ fontSize: 15, }}>{req.Title}</TableCell>
              <TableCell align='center' sx={{ fontSize: 15, }}>
                {new Date(req.RequestDate).toISOString().slice(0, 10)}
              </TableCell>
              <TableCell align='center' sx={{ fontSize: 15, }}>{req.Status}</TableCell>
              <TableCell align='center' sx={{ fontSize: 15, }}>
                {req.deviceType} #{req.deviceNo}
                {req.deviceDesc && ` (${req.deviceDesc})`}
              </TableCell>
              <TableCell align='center' sx={{ fontSize: 15, }}>

                    <IconButton onClick={() => handleViewHistory(req.RequestID)}>
                      <VisibilityIcon />
                    </IconButton>
                {['قيد الإستلام', 'استلم'].includes(req.Status) && (
                  <>
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
                  </>
                )}
                {req.Status === 'تم الإنجاز' && (
                  <IconButton
                    color="success"
                    sx={{ mx: 0.5 }}
                    onClick={() => {
                      setCurrentId(req.RequestID);
                      setCompleteOpen(true);
                    }}
                  >
                    <CheckIcon />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
</Paper>
      {/* — New Request Dialog — */}
      <NewRequestDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => {
          setNewOpen(false);
          refresh();
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
            refresh();
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
                refresh();
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

      {/* — Acknowledge Dialog — */}
      {currentId != null && (
        <AcknowledgeDialog
          open={completeOpen}
          id={currentId}
          onClose={() => setCompleteOpen(false)}
          onSuccess={() => {
            setCompleteOpen(false);
            refresh();
            setSnackbar({ message: 'تم تأييد الإنجاز', severity: 'success' });
          }}
          onError={msg => setSnackbar({ message: msg, severity: 'error' })}
        />
      )}
<Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
  <DialogTitle>سجل العمليات</DialogTitle>
  <DialogContent dividers>
    {viewLoading
      ? <Typography>جاري التحميل…</Typography>
      : viewHistory.length === 0
        ? <Typography>لا توجد عمليات.</Typography>
        : viewHistory.map((h,i) => (
            <Box key={i} sx={{ p:1, my:1, bgcolor:'grey.100', borderRadius:1 }}>
              <Typography><strong>{h.ActionType}</strong>
                {h.ActionNote && ` — ${h.ActionNote}`}</Typography>
              <Typography variant="caption">
                بواسطة {h.ActionBy} في {new Date(h.ActionDate).toLocaleString()}
              </Typography>
            </Box>
          ))
    }
  </DialogContent>
  <DialogActions sx={{ flexDirection: 'column', gap: 1 }}>
    {/* only allow beneficiary to comment if status === 'معلق' */}
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
          onClick={async () => {
            setViewSending(true);
            try {
              const res = await fetch(`/api/requests/${currentId}/comment`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                credentials: 'include',
                body: JSON.stringify({ comment: viewComment.trim() })
              });
              if (!res.ok) throw await res.json();
              setViewComment('');
              setSnackbar({ severity:'success', message:'تم إضافة التعليق' });
              // refresh only non-comment history
              const hres = await fetch(`/api/requests/${currentId}/history`,{ credentials:'include' });
              if (hres.ok) {
                const all: HistoryItem[] = await hres.json();
                setViewHistory(all.filter(h => h.ActionType !== 'تعليق'));
              }
              
            } catch (err: any) {
              setSnackbar({ message: err.error || 'فشل في الإرسال', severity: 'error' });
            } finally {
              setViewSending(false);
            }
          }}
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
        <Alert
          severity={snackbar?.severity}
          onClose={() => setSnackbar(null)}
          sx={{ width: '100%' }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


// ———————————————————————————————————————————————————————————————————
// NewRequestDialog
// ———————————————————————————————————————————————————————————————————


import {
  Box,

  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

type CategoryKey = 'software' | 'maintenance' | 'other';

// 1) تعريف الفئات مع أيقوناتها وتسميات العرض
const categories: Record<CategoryKey, { label: string; icon: React.ReactNode; services: string[] }> = {
  software: {
    label: 'خدمات برمجيّة',
    icon: <CodeIcon color="primary" />,
    services: ['أجهزة البصمة', 'الموقع الألكتروني', 'تحديث نظام برمجي'],
  },
  maintenance: {
    label: 'خدمات صيانة',
    icon: <BuildIcon color="primary" />,
    services: ['صيانة الحاسبات', 'صيانة الطابعات', 'صيانة أجهزة الاستنساخ', 'صيانة كاميرات المراقبة'],
  },
  other: {
    label: 'خدمات أخرى',
    icon: <MoreHorizIcon color="primary" />,
    services: ['الأرشفة', 'مضاد الفايروسات'],
  },
};


// 2) مثال لأجهزة مرتبطة بكل خدمة (يمكنك استبدالها ببياناتك الحقيقية)
const devicesByService: Record<string, string[]> = {
  'تطوير مواقع ويب': ['خادم ويب Apache', 'خادم قواعد بيانات MySQL'],
  'تطبيقات جوال': ['هاتف Android', 'هاتف iOS'],
  'تكامل أنظمة API': ['بوابة API Gateway', 'خدمة OAuth2'],
  'صيانة خوادم': ['سيرفر Rack', 'UPS احتياطي'],
  'دعم فني عن بُعد': ['برنامج TeamViewer', 'VPN Server'],
  // ...
};



type DevcType = { id: number; name: string };
type Device   = { id: number; noDv: number; caseDesc: string; descriptionName: string };
type UserContext = {
  id: number; name: string; role: string;
  division:   { id: number; name: string };
  department: { id: number; name: string };
  section:    { id: number; name: string };
};
interface NewProps {
  open: boolean;
  onClose(): void;
  onSuccess(): void;
  onError(msg: string): void;
}

function NewRequestDialog({ open, onClose, onSuccess, onError }: NewProps) {
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [types, setTypes]               = useState<DevcType[]>([]);
  const [selectedType, setSelectedType] = useState<number | ''>('');
  const [devices, setDevices]           = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [images, setImages]             = useState<File[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [ctx, setCtx]                   = useState<UserContext | null>(null);
const [activeStep, setActiveStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCategory(null);
    setSelectedService(null);
  };

  const handleBack = () => {
    setSelectedService(null);
    setActiveStep((prev) => prev - 1);
  };
  // Load user context once
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (!data.error) setCtx(data) })
      .catch(() => {});
  }, []);

  // Load device types
  useEffect(() => {
    fetch('/api/devctypes', { credentials: 'include' })
      .then(r => r.json())
      .then(setTypes)
      .catch(() => onError('فشل في جلب أنواع الأجهزة'));
  }, [onError]);

  // Load devices when type or context changes
  useEffect(() => {
    if (!selectedType || !ctx) {
      setDevices([]);
      return;
    }
    const { division, department, section } = ctx;
    const params = new URLSearchParams({
      typeId:        String(selectedType),
      divisionId:    String(division.id),
      departmentId:  String(department.id),
      sectionId:     String(section.id),
    });
    fetch(`/api/devices?${params}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setDevices)
      .catch(() => onError('فشل في جلب الأجهزة'));
  }, [selectedType, ctx, onError]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title||!description||!selectedType||selectedDevice==null) {
      return onError('يرجى تعبئة جميع الحقول واختيار جهاز');
    }
    setUploading(true);
    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    form.append('deviceId', String(selectedDevice));
    images.forEach(img => form.append('images', img));
    const res = await fetch('/api/requests',{ method:'POST', body:form, credentials:'include' });
    setUploading(false);
    if (res.ok) {
      onSuccess();
      setTitle(''); setDescription(''); setSelectedType(''); setSelectedDevice(null); setImages([]);
    } else {
      const { error } = await res.json().catch(() => ({}));
      onError(error||'فشل إرسال الطلب');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>تقديم طلب جديد</DialogTitle>
      <DialogContent dividers>
        <Box component="form" sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <TextField
            label="الموضوع"
            fullWidth required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <TextField
            label="تفاصيل الطلب"
            fullWidth required multiline minRows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <FormControl fullWidth required>
            <InputLabel>نوع الجهاز</InputLabel>
            <Select
              value={selectedType}
              label="نوع الجهاز"
              onChange={e => setSelectedType(Number(e.target.value) || '')}
            >
              <MenuItem value=""><em>— اختر النوع —</em></MenuItem>
              {types.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {devices.length>0 && (
            <>
              <Typography variant="subtitle1">اختر جهازاً:</Typography>
              <RadioGroup
                value={selectedDevice ?? ''}
                onChange={e => setSelectedDevice(Number(e.target.value))}
              >
                <Table size="small">
                  <TableHead
  sx={{
    bgcolor: 'primary.light',
    '& .MuiTableCell-root': {
      color: 'common.white',     // أو 'white'
      fontWeight: 'bold',
      fontSize: 16,              // إذا أردت تغيير حجم الخط
    }
  }}
>
                    <TableRow >
                      <TableCell align='center' sx={{ fontSize: 15, }}>اختيار</TableCell>
                      <TableCell align='center' sx={{ fontSize: 15, }}>رقم الجهاز</TableCell>
                      <TableCell align='center' sx={{ fontSize: 15, }}>الحالة</TableCell>
                      <TableCell align='center' sx={{ fontSize: 15, }}>الوصف</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {devices.map(d => (
                      <TableRow key={d.id} hover>
                        <TableCell align='center' sx={{ fontSize: 15, }}>
                          <FormControlLabel
                            control={<Radio size="small" />}
                            value={d.id}
                            label=""
                          />
                        </TableCell>
                        <TableCell align='center' sx={{ fontSize: 15, }}>{d.noDv}</TableCell>
                        <TableCell align='center' sx={{ fontSize: 15, }}>{d.caseDesc}</TableCell>
                        <TableCell align='center' sx={{ fontSize: 15, }}>{d.descriptionName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </RadioGroup>
            </>
          )}
          <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* STEP 0: اختيار الفئة */}
        <Step>
          <StepLabel>الخدمات</StepLabel>
          <StepContent>
            <List disablePadding>
              {(
                Object.keys(categories) as CategoryKey[]
              ).map((key) => (
                <ListItemButton
                  key={key}
                  onClick={() => {
                    setSelectedCategory(key);
                    setActiveStep(1);
                  }}
                  sx={{ pl: 0 }}
                >
                  {categories[key].icon}
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ mr: 2 }}>
                        {categories[key].label}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </StepContent>
        </Step>

        {/* STEP 1: خدمات الفئة المختارة */}
        <Step>
          <StepLabel>
            {selectedCategory
              ? categories[selectedCategory].label
              : 'اختر الفئة أولاً'}
          </StepLabel>
          <StepContent>
            {selectedCategory && (
              <List disablePadding>
                {categories[selectedCategory].services.map((svc) => (
                  <ListItemButton
                    key={svc}
                    onClick={() => {
                      setSelectedService(svc);
                      setActiveStep(2);
                    }}
                    sx={{ pl: 0 }}
                  >
                    <ListItemText primary={svc} />
                  </ListItemButton>
                ))}
              </List>
            )}
            <Box sx={{ mt: 2 }}>
              <Button disabled={activeStep === 0} onClick={() => setActiveStep(0)} sx={{ mr: 1 }}>
                السابق
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* STEP 2: عرض الأجهزة المرتبطة */}
        <Step>
          <StepLabel>
            {selectedService ?? 'اختر الخدمة أولاً'}
          </StepLabel>
          <StepContent>
            {selectedService ? (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  الأجهزة المرتبطة بخدمة “{selectedService}”:
                </Typography>
                <List disablePadding>
                  {(devicesByService[selectedService] || []).map((dev) => (
                    <ListItemText key={dev} sx={{ pl: 0, mb: 1 }}>
                      • {dev}
                    </ListItemText>
                  ))}
                </List>
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
          <Button variant="outlined" component="label">
            رفع صور
            <input hidden type="file" multiple onChange={handleImageUpload} />
          </Button>
          {images.length>0 && (
            <Typography variant="body2">{images.length} صورة محمّلة</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          onClick={handleSubmit}
          disabled={uploading}
          color="accent"
          variant="contained"
        >
          {uploading ? 'جارٍ الإرسال…' : 'إرسال'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


// ———————————————————————————————————————————————————————————————————
// EditRequestDialog
// ———————————————————————————————————————————————————————————————————

interface EditProps {
  open: boolean;
  id: number;
  onClose(): void;
  onSuccess(): void;
  onError(msg: string): void;
}

function EditRequestDialog({ open, id, onClose, onSuccess, onError }: EditProps) {
const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return; // لا نحمّل البيانات إذا كان الـ dialog مغلق
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
  }, [id, open]); // نعتمد هنا على id و open فقط

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

// ———————————————————————————————————————————————————————————————————
// AcknowledgeDialog
// ———————————————————————————————————————————————————————————————————

interface AckProps {
  open: boolean;
  id: number;
  onClose(): void;
  onSuccess(): void;
  onError(msg: string): void;
}

function AcknowledgeDialog({ open, id, onClose, onSuccess, onError }: AckProps) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const handleConfirm = async () => {
    if (!comment.trim()) return onError('يرجى كتابة رأيك');
    setSending(true);
    const res = await fetch(`/api/requests/${id}/acknowledge`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({ comment:comment.trim() })
    });
    setSending(false);
    if (res.ok) onSuccess();
    else {
      const { error } = await res.json().catch(()=>({}));
      onError(error||'فشل تأييد الإنجاز');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>تأييد إنجاز الطلب #{id}</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="اكتب رأيك"
          fullWidth multiline minRows={3}
          value={comment}
          onChange={e=>setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          onClick={handleConfirm}
          disabled={sending}
          color="accent"
          variant="contained"
        >
          تأكيد
        </Button>
      </DialogActions>
    </Dialog>
  );
}
