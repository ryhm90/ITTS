import { Button } from '@mui/material';

export default function ExportButtons({ requestId }: { requestId: number }) {
  const exportFile = async (type: 'pdf' | 'excel') => {
    const res = await fetch(`/api/export?requestId=${requestId}&type=${type}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request_${requestId}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
  };

  return (
    <>
      <Button onClick={() => exportFile('pdf')}>تصدير PDF</Button>
      <Button onClick={() => exportFile('excel')}>تصدير Excel</Button>
    </>
  );
}
