import * as XLSX from "sheetjs-style";

export const exportNhatKyToExcel = (filteredData) => {
  const worksheetData = filteredData.map((r, index) => ({
    STT: index + 1,
    Ngày: r.date,
    Họ_tên: r.hoTen,
    Phép: r.loai === 'P' ? '✓' : '✗',
    Lý_do: r.lydo || ''
  }));

  const ws = XLSX.utils.json_to_sheet(worksheetData);

  // Định dạng phần tiêu đề (hàng đầu tiên)
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4F81BD" } },
    alignment: { horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } }
    }
  };

  // Áp dụng style cho tất cả các ô trong hàng đầu tiên
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cell]) continue;
    ws[cell].s = headerStyle;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DiemDanh");
  XLSX.writeFile(wb, "diemdanh.xlsx");
};
