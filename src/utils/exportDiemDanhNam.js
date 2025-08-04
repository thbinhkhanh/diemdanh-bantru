import * as XLSX from 'sheetjs-style';

export function exportDiemDanhNam(dataList, selectedYear, selectedClass, monthSet) {
  const title1 = 'TRƯỜNG TIỂU HỌC BÌNH KHÁNH';
  const title2 = `THỐNG KÊ ĐIỂM DANH NĂM ${selectedYear}`;
  const title3 = `LỚP: ${selectedClass}`;

  if (!dataList || dataList.length === 0) return;

  const headerRow1 = ['STT', 'HỌ VÀ TÊN'];
  const headerRow2 = ['', ''];

  monthSet.forEach(month => {
    headerRow1.push(`Tháng ${month}`, '');
    headerRow2.push('P', 'K');
  });

  headerRow1.push('TỔNG');
  headerRow2.push('');

  const dataRows = dataList.map((item, index) => {
    const row = [index + 1, item.hoVaTen];
    let total = 0;
    monthSet.forEach(month => {
      const p = item.monthSummary?.[month]?.P || 0;
      const k = item.monthSummary?.[month]?.K || 0;
      row.push(p === 0 ? '' : p);
      row.push(k === 0 ? '' : k);
      total += p + k;
    });
    row.push(total === 0 ? '' : total);
    return row;
  });

  const totalRow = ['TỔNG', ''];
  monthSet.forEach(month => {
    const sumP = dataList.reduce((acc, cur) => acc + (cur.monthSummary?.[month]?.P || 0), 0);
    const sumK = dataList.reduce((acc, cur) => acc + (cur.monthSummary?.[month]?.K || 0), 0);
    totalRow.push(sumP === 0 ? '' : sumP);
    totalRow.push(sumK === 0 ? '' : sumK);
  });
  const grandTotal = dataList.reduce((acc, cur) => {
    return acc + monthSet.reduce((sum, month) => {
      const p = cur.monthSummary?.[month]?.P || 0;
      const k = cur.monthSummary?.[month]?.K || 0;
      return sum + p + k;
    }, 0);
  }, 0);

  totalRow.push(grandTotal === 0 ? '' : grandTotal);

  const finalData = [
    [title1],
    [title2],
    [title3],
    [],
    headerRow1,
    headerRow2,
    ...dataRows,
    totalRow
  ];

  const ws = XLSX.utils.aoa_to_sheet(finalData);

  // Cài độ rộng cột
  ws['!cols'] = [
    { wch: 5 },
    { wch: 27.5 },
    ...monthSet.flatMap(() => [{ wch: 4.5 }, { wch: 4.5 }]), // P, K
    { wch: 8 }
  ];

  // Merge title và tiêu đề tháng
  const totalCols = headerRow1.length;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
    { s: { r: finalData.length - 1, c: 0 }, e: { r: finalData.length - 1, c: 1 } }
  ];

  // Merge mỗi tiêu đề tháng (P+K)
  let startCol = 2;
  monthSet.forEach(() => {
    ws['!merges'].push({
      s: { r: 4, c: startCol },
      e: { r: 4, c: startCol + 1 }
    });
    startCol += 2;
  });

  // Merge cột STT và Họ Tên (dòng 4–5)
  ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 5, c: 0 } });
  ws['!merges'].push({ s: { r: 4, c: 1 }, e: { r: 5, c: 1 } });

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 0; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;

      if (R === 0) {
        cell.s = {
          font: { italic: true, color: { rgb: '2E74B5' }, sz: 12 },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      } else if (R === 1) {
        cell.s = {
          font: { bold: true, sz: 16, color: { rgb: '2E74B5' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else if (R === 2) {
        cell.s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else if (R === 4 || R === 5) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'EAF1FB' } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      } else if (R >= 6 && R < range.e.r) {
        cell.s = {
          border: {
            top: { style: 'thin', color: { rgb: '999999' } },
            bottom: { style: 'thin', color: { rgb: '999999' } },
            left: { style: 'thin', color: { rgb: '999999' } },
            right: { style: 'thin', color: { rgb: '999999' } }
          },
          alignment: {
            horizontal: C === 1 ? 'left' : 'center',
            vertical: 'center'
          }
        };
      } else if (R === range.e.r) {
        cell.s = {
          font: { bold: true },
          border: {
            top: { style: 'thin', color: { rgb: '999999' } },
            bottom: { style: 'thin', color: { rgb: '999999' } },
            left: { style: 'thin', color: { rgb: '999999' } },
            right: { style: 'thin', color: { rgb: '999999' } }
          },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Năm ${selectedYear}`);
  XLSX.writeFile(wb, `DiemDanh_Nam${selectedYear}_Lop${selectedClass}.xlsx`);
}
