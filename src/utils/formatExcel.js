import * as XLSX from "sheetjs-style";
import { saveAs } from "file-saver";
import { format } from "date-fns";

export async function exportFormattedExcel(dataList, columnDates, month, year, selectedClass) {
  if (!dataList || dataList.length === 0) return;

  // Workbook mới
  const wb = XLSX.utils.book_new();

  // Header (hàng đầu tiên, tiêu đề, thông tin lớp, header bảng)
  const headerRow = ["STT", "HỌ VÀ TÊN", ...columnDates.map(d => d.toString()), "TỔNG CỘNG"];

  const data = [
    ["TRƯỜNG TIỂU HỌC BÌNH KHÁNH"], // row1
    [], // row2
    [`THỐNG KÊ BÁN TRÚ THÁNG ${month} NĂM ${year}`], // row3
    [`LỚP: ${selectedClass}`], // row4
    headerRow, // row5 (header bảng)
  ];

  // Tổng cộng theo cột
  const totalPerColumn = Array(columnDates.length).fill(0);

  // Dữ liệu học sinh
  dataList.forEach((item, index) => {
    const rowData = [
      index + 1,
      item.hoVaTen,
      ...columnDates.map((date, i) => {
        const mark = item.banTruNgay?.[date] === true || item.banTruNgay?.[date] === "✓" ? "✓" : "";
        if (mark === "✓") totalPerColumn[i]++;
        return mark;
      }),
    ];

    // Tổng cộng theo hàng
    const rowTotal = rowData.slice(2).filter(cell => cell === "✓").length;
    rowData.push(rowTotal);
    data.push(rowData);
  });

  // Dòng tổng cộng cuối
  const finalRow = ["TỔNG CỘNG", "", ...totalPerColumn, totalPerColumn.reduce((a, b) => a + b, 0)];
  data.push(finalRow);

  // Tạo worksheet từ dữ liệu
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merge tiêu đề
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }, // merge row1
    { s: { r: 2, c: 0 }, e: { r: 2, c: headerRow.length - 1 } }, // merge row3
    { s: { r: 3, c: 0 }, e: { r: 3, c: headerRow.length - 1 } }, // merge row4
  ];

  // Styling
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;

      cell.s = {
        alignment: { horizontal: C === 1 ? "left" : "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
        font: {},
      };

      // Header row (row5) hoặc final row (cuối)
      if (R === 4 || R === data.length - 1) {
        cell.s.font = { bold: true };
        cell.s.fill = { fgColor: { rgb: "D9E1F2" } };
      }

      // Tiêu đề trường
      if (R === 0) {
        cell.s.font = { italic: true };
        cell.s.alignment = { horizontal: "left" };
      }

      // Tiêu đề thống kê
      if (R === 2) {
        cell.s.font = { bold: true, sz: 14, color: { rgb: "1F4E78" } };
      }

      // Lớp
      if (R === 3) {
        cell.s.font = { bold: true };
      }
    }
  }

  // Đặt độ rộng cột
  ws["!cols"] = [
    { wch: 5 }, // STT
    { wch: 30 }, // Họ tên
    ...columnDates.map(() => ({ wch: 5 })),
    { wch: 10 }, // Tổng cộng
  ];

  // Thêm sheet vào workbook
  XLSX.utils.book_append_sheet(wb, ws, "Bán trú");

  // Xuất file
  const now = new Date();
  const filename = `Thong_ke_ban_tru_${selectedClass}_${month}_${year}_${now.getHours()}h${now.getMinutes()}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
}
