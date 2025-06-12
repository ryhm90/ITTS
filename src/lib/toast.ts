import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type?: ToastType;
  message: string;
  description?: string;
  duration?: number; // مدة العرض بالمللي ثانية
}

export function showToast({
  type = 'info',
  message,
  description,
  duration = 3000,
}: ToastOptions) {
  switch (type) {
    case 'success':
      toast.success(message, { description, duration });
      break;
    case 'error':
      toast.error(message, { description, duration });
      break;
    case 'warning':
      toast.warning(message, { description, duration });
      break;
    default:
      toast(message, { description, duration });
      break;
  }
}
