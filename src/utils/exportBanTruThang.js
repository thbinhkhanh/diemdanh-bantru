import * as XLSX from 'sheetjs-style'; // dùng sheetjs-style để hỗ trợ style cho cell

export function exportBanTruThang(dataList, selectedDate, selectedClass, daySet) {
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  if (!dataList || dataList.length === 0) return;

  const title1 = "TRƯỜNG TIỂU HỌC BÌNH KHÁNH";
  const title2 = `THỐNG KÊ BÁN TRÚ THÁNG ${month} NĂM ${year}`;
  const title3 = `LỚP: ${selectedClass}`;

  const headerRow = ["STT", "HỌ VÀ TÊN", ...daySet.map((d) => `${d}`), "TỔNG CỘNG"];

  const dataRows = dataList.map((item, index) => {
    const row = [index + 1, item.hoVaTen];
    daySet.forEach((day) => {
      const val = item.daySummary?.[day] || 0;
      row.push(val === 0 ? "" : val);
    });
    row.push(item.total === 0 ? "" : item.total);
    return row;
  });

  const totalDay = daySet.map(
    (d) => dataList.reduce((sum, item) => sum + (item.daySummary?.[d] ? 1 : 0), 0)
  );
  const totalAll = dataList.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalRow = ["TỔNG CỘNG", "", ...totalDay.map(n => (n === 0 ? "" : n)), totalAll === 0 ? "" : totalAll];

  const finalData = [
    [title1],
    [title2],
    [title3],
    [],
    headerRow,
    ...dataRows,
    totalRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(finalData);

  // Đặt độ rộng cột
  ws["!cols"] = [
    { wch: 5 },
    { wch: 27 },
    ...daySet.map(() => ({ wch: 6 })),
    { wch: 10 },
  ];

  const totalCols = headerRow.length;
  const totalRows = finalData.length;

  // Merge các dòng tiêu đề và dòng tổng cộng
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
    { s: { r: totalRows - 1, c: 0 }, e: { r: totalRows - 1, c: 1 } },
  ];

  // Styling
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = 0; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;

      // Tiêu đề
      if (R === 0) {
        cell.s = {
          font: { italic: true, color: { rgb: "2E74B5" }, sz: 12 },
          alignment: { horizontal: "left", vertical: "center" },
        };
      } else if (R === 1) {
        cell.s = {
          font: { bold: true, sz: 16, color: { rgb: "2E74B5" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      } else if (R === 2) {
        cell.s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      // Header
      else if (R === 4) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "EAF1FB" } },
          border: border("000000"),
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      // Dữ liệu
      else if (R >= 5 && R < range.e.r) {
        cell.s = {
          border: border("999999"),
          alignment: {
            horizontal: C === 1 ? "left" : "center",
            vertical: "center",
          },
        };
      }
      // Tổng cộng
      else if (R === range.e.r) {
        cell.s = {
          font: { bold: true },
          border: border("999999"),
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Tháng ${month}`);
  XLSX.writeFile(wb, `ThongKe_Thang${month}_${selectedClass}.xlsx`);
}

// Hàm helper tạo viền
function border(color) {
  return {
    top: { style: "thin", color: { rgb: color } },
    bottom: { style: "thin", color: { rgb: color } },
    left: { style: "thin", color: { rgb: color } },
    right: { style: "thin", color: { rgb: color } },
  };
}
