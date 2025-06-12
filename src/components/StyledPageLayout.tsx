// src/components/StyledPageLayout.tsx
import { styled } from '@mui/material/styles'
import MuiTableCell, { TableCellProps } from '@mui/material/TableCell'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import MuiTable from '@mui/material/Table'
import MuiTableHead from '@mui/material/TableHead'
import MuiTableRow from '@mui/material/TableRow'
import MuiTableBody from '@mui/material/TableBody'
import MuiDialog from '@mui/material/Dialog'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { TabContext, TabList } from '@mui/lab'

// === عام ===
export const PageContainer = styled(Box)(({ theme }) => ({
  padding: 24,
  direction: 'rtl',
}))
export const HeaderRow = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
}))
export const PageTitle = styled('h4')(({ theme }) => ({
  fontWeight: 'bold',
  ...theme.typography.h4,
}))

// === جدول ===
export const TablePaper = styled(Paper)(() => ({
  width: '100%',
  overflowX: 'auto',
  marginBottom: 24,
}))
export const Table = styled(MuiTable)({})
export const TableHead = styled(MuiTableHead)(({ theme }) => ({
  background: theme.palette.primary.light,
  color: theme.palette.common.white,         // نص أبيض
  '& th, & td': {
    color: theme.palette.common.white,       // يضمن النص الأبيض في كل خلايا الهيدر
  },
}))
export const TableRow = styled(MuiTableRow)(({ theme }) => ({
  '&:hover': {
    background: theme.palette.action.hover,
  },
}))
export const TableHeaderCell = styled(MuiTableCell, {
  // لا تنقل خاصية `component` إلى الـ DOM لأننا نريدها تُمرر إلى MUI فقط
  shouldForwardProp: (prop) => prop !== 'component'
})<{ /* إذا أردت، يمكنك هنا تحديد Props إضافية */ }>(
  ({ theme }) => ({
    fontWeight: theme.typography.fontWeightBold,
    textAlign: 'center',
    padding: 12,
  })
)
export const TableBodyCell = styled(MuiTableCell)(({ theme }) => ({
  textAlign: 'center',
  padding: 12,
}))

// === Dialog بالتبويبات ===
export const Dialog = styled(MuiDialog)({})
export const StyledTabContext = TabContext
export const StyledTabList = styled(TabList)(({ theme }) => ({
  marginBottom: 16,
}))
export const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightBold,
}))
export const DialogContent = styled('div')(() => ({
  padding: 16,
}))
export const DialogActions = styled('div')(() => ({
  padding: '8px 16px',
  display: 'flex',
  justifyContent: 'space-between',
}))

// === سجل الدردشة (chat-style log) ===
export const ChatContainer = styled(Paper)(({ theme }) => ({
  maxHeight: 300,
  overflowY: 'auto',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}))
export const ChatBubble = styled(Box, {
  shouldForwardProp: prop => prop !== 'mine',
})<{ mine?: boolean }>(({ theme, mine }) => ({
  backgroundColor: mine
    ? theme.palette.primary.light
    : theme.palette.grey[100],
  color: mine
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary,
  padding: 12,
  borderRadius: 8,
  alignSelf: mine ? 'flex-start' : 'flex-end',
  maxWidth: '75%',
}))

// === form & inputs ===
export const SectionTitle = styled('h6')(({ theme }) => ({
  margin: '16px 0 8px',
  ...theme.typography.h6,
}))
export const StyledForm = styled('form')(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginTop: 16,
}))
export const FullWidthTextField = styled(TextField)(() => ({
  width: '100%',
}))
export const FullWidthButton = styled(Button)(() => ({
  width: '100%',
}))

export const PrimaryButton = styled(Button)(({ theme }) => ({
  fontSize: 15,
  padding: theme.spacing(1.25, 2),
  backgroundColor: theme.palette.secondary.main,
  color: theme.palette.common.black,
  '&:hover': {
    backgroundColor: theme.palette.secondary.dark,
  },
}))