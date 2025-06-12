// src/components/StyledComponents.tsx
import React from 'react';
import {
  Box,
  styled,
  Typography,
  Button,
  TableCell,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

// —— Page container with responsive padding
export const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(6),
  },
}));

// —— Header row: title + action button
export const HeaderRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
});

// —— Page title typography
export const PageTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 600,
}));

// —— Primary action button (e.g. “تقديم طلب جديد”)
export const PrimaryButton = styled(Button)(({ theme }) => ({
  fontSize: 15,
  padding: theme.spacing(1.25, 2),
}));

// —— Table wrapped in Paper
export const TablePaper = styled(Paper)({
  overflowX: 'auto',
});

// —— Table header cell
export const TableHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.common.white,
  fontWeight: 600,
  fontSize: 16,
  textAlign: 'center',
}));

// —— Regular table cell
export const TableBodyCell = styled(TableCell)({
  fontSize: 15,
  textAlign: 'center',
});

// —— IconButton with small horizontal margin
export const ActionIconButton = styled(IconButton)({
  margin: '0 4px',
});

// —— Dialog wrappers
export const StyledDialog = styled(Dialog)({});
export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));
export const StyledDialogContent = styled(DialogContent)({
  paddingTop: 0,
});
export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2),
}));

// —— Snackbar wrapper (can be used as-is)
export const SnackbarAlert = styled(Typography)({});

