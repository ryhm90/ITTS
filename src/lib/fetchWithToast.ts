import { showToast } from '@/lib/toast';

interface FetchWithToastOptions extends RequestInit {
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export async function fetchWithToast(
  input: RequestInfo | URL,
  {
    successMessage = 'تمت العملية بنجاح!',
    errorMessage = 'حدث خطأ أثناء تنفيذ العملية.',
    showSuccessToast = true,
    showErrorToast = true,
    ...init
  }: FetchWithToastOptions = {}
) {
  try {
    const res = await fetch(input, init);

    if (!res.ok) {
      if (showErrorToast) {
        showToast({ type: 'error', message: errorMessage });
      }
      throw new Error(`Fetch error: ${res.status}`);
    }

    if (showSuccessToast) {
      showToast({ type: 'success', message: successMessage });
    }

    return res;
  } catch (error) {
    if (showErrorToast) {
      showToast({ type: 'error', message: errorMessage });
    }
    throw error;
  }
}
