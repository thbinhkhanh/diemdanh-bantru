import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function formatDiemDangThang(dataList, columnDates, month, year, selectedClass) {
  if (!dataList || dataList.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bán trú');

  // Tiêu đề
  sheet.mergeCells('A1:AF1');
  sheet.getCell('A1').value = 'TRƯỜNG TIỂU HỌC BÌNH KHÁNH';
  sheet.getCell('A1').alignment = { horizontal: 'left' };
  sheet.getCell('A1').font = { italic: true };

  sheet.mergeCells('M2:W2');
  sheet.getCell('M2').value = `THỐNG KÊ BÁN TRÚ THÁNG ${month} NĂM ${year}`;
  sheet.getCell('M2').font = { bold: true, size: 14, color: { argb: '1F4E78' } };
  sheet.getCell('M2').alignment = { horizontal: 'center' };

  sheet.mergeCells('M3:N3');
  sheet.getCell('M3').value = `LỚP: ${selectedClass}`;
  sheet.getCell('M3').font = { bold: true };
  sheet.getCell('M3').alignment = { horizontal: 'center' };

  // Header
  const headerRow = ['STT', 'HỌ VÀ TÊN', ...columnDates.map(d => d.toString()), 'TỔNG CỘNG'];
  sheet.addRow(headerRow);

  const header = sheet.getRow(4);
  header.font = { bold: true };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'D9E1F2' },
  };
  header.alignment = { horizontal: 'center', vertical: 'middle' };
  header.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Tổng cộng theo cột
  const totalPerColumn = Array(columnDates.length).fill(0);

  // Dữ liệu
  dataList.forEach((item, index) => {
    const rowData = [
      index + 1,
      item.hoVaTen,
      ...columnDates.map((date, i) => {
        const raw = item.banTruNgay?.[date];
        const mark = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
        if (mark === 'P' || mark === 'K') totalPerColumn[i]++;
        return mark;
      }),
    ];

    // Tổng cộng theo hàng (số ngày có P hoặc K)
    const rowTotal = rowData.slice(2).filter(val => val === 'P' || val === 'K').length;
    rowData.push(rowTotal);
    sheet.addRow(rowData);
  });

  // Dòng tổng cộng dưới cùng
  const finalRow = ['TỔNG CỘNG', '', ...totalPerColumn, totalPerColumn.reduce((a, b) => a + b, 0)];
  sheet.addRow(finalRow);

  // Styling toàn bộ bảng
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: colNumber === 2 ? 'left' : 'center',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (rowNumber === sheet.rowCount || rowNumber === 4) {
        cell.font = { bold: true };
      }
    });
  });

  // Đặt độ rộng cột
  const colWidths = [
    5,  // STT
    30, // Họ tên
    ...columnDates.map(() => 5),
    10, // Tổng cộng
  ];
  colWidths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // Xuất file
  const now = new Date();
  const filename = `Thong_ke_nghi_ban_tru_${selectedClass}_${month}_${year}_${now.getHours()}h${now.getMinutes()}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}
