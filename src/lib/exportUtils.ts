import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToExcel(data: any[], fileName: string) {
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Sheet1');
  writeFile(wb, `${fileName}.xlsx`);
}

export function exportToPDF(data: any[], title: string) {
  const doc = new jsPDF();
  doc.text(title, 10, 10);

  const tableData = data.map((row) => Object.values(row));

  (doc as any).autoTable({
    head: [Object.keys(data[0] || {})],
    body: tableData,
  });

  doc.save(`${title}.pdf`);
}
