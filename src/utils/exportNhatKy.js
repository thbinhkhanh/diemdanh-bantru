import * as XLSX from "sheetjs-style";

// ✅ Format chuỗi ngày về dd/mm/yyyy
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const exportNhatKyToExcel = (filteredData) => {
  if (!filteredData || filteredData.length === 0) return;

  // 1. Dòng tiêu đề A1
  const title = [["NHẬT KÝ ĐIỂM DANH"]];

  // 2. Dòng tiêu đề bảng ở dòng 3
  const headerRow = ["STT", "HỌ VÀ TÊN", "LỚP", "CÓ PHÉP", "LÝ DO VẮNG", "NGÀY NGHỈ"];

  // 3. Dữ liệu từ dòng 4
  const dataRows = filteredData.map((r, index) => [
    index + 1,
    r.hoTen || "",
    r.lop || "",
    r.loai === "P" ? "P" : "K",
    r.lydo || "Không rõ lý do",
    formatDate(r.ngay),
  ]);

  // 4. Tạo mảng dữ liệu tổng
  const finalData = [...title, [], headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(finalData);

  // 5. Merge tiêu đề A1:F1
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // 6. Đặt độ rộng cột
  ws["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 10 },
    { wch: 10 },
    { wch: 30 },
    { wch: 15 },
  ];

  // 7. Styling
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      let cell = ws[cellRef];
      if (!cell) {
        cell = { t: "s", v: "" };
        ws[cellRef] = cell;
      }

      // ✅ Dòng tiêu đề A1
      if (R === 0) {
        cell.s = {
          font: {
            bold: true,
            sz: 16,
            color: { rgb: "0070C0" }, // Màu xanh dương (giống Office Blue)
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
          },
        };

        continue;
      }

      const isHeader = R === 2;
      const isData = R > 2;

      // ✅ Định dạng dòng tiêu đề bảng (dòng 3)
      if (isHeader) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4F81BD" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
        continue;
      }

      // ✅ Styling dữ liệu từ dòng 4 trở đi
      if (isData) {
        if (C === 5) cell.t = "s"; // ép ngày nghỉ thành chuỗi

        cell.s = {
          font: { color: { rgb: "000000" } },
          alignment: {
            horizontal: [1, 4].includes(C) ? "left" : "center",
            vertical: "center",
          },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }
    }
  }

  // 8. Ghi file Excel
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NhatKyDiemDanh");

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `NhatKyDiemDanh_${pad(now.getDate())}_${pad(
    now.getMonth() + 1
  )}_${now.getFullYear()}_${pad(now.getHours())}_${pad(
    now.getMinutes()
  )}.xlsx`;

  XLSX.writeFile(wb, filename);
};
