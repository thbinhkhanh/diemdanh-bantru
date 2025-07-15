import * as XLSX from "sheetjs-style";

export function formatExcel_Backup(dataList, columnDates, year, selectedClass) {
  if (!dataList || dataList.length === 0) return;

  const headerRow = [
    "stt",
    "id",
    "maDinhDanh",
    "hoVaTen",
    "lop",
    "huyDangKy",
    ...columnDates,
  ];

  const dataRows = dataList.map((item, index) => {
    const row = [
      index + 1,
      item.id || "",
      item.maDinhDanh || "",
      item.hoVaTen || "",
      item.lop || "",
      item.huyDangKy || "",
    ];

    columnDates.forEach((dateStr) => {
      row.push(item.banTruNgay?.[dateStr] || "");
    });

    return row;
  });

  const finalData = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(finalData);

  // Đặt độ rộng cột
  ws["!cols"] = [
    { wch: 5 },   // stt
    { wch: 15 },  // id
    { wch: 20 },  // maDinhDanh
    { wch: 30 },  // hoVaTen
    { wch: 8 },   // lop
    { wch: 12 },  // huyDangKy
    ...columnDates.map(() => ({ wch: 12 })),  // các ngày
  ];

  // Styling cho từng ô
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = 0; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;

      cell.s = R === 0
        ? {
            font: { bold: true },
            fill: { fgColor: { rgb: "EAF1FB" } },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
            alignment: { horizontal: "center", vertical: "center" },
          }
        : {
            border: {
              top: { style: "thin", color: { rgb: "999999" } },
              bottom: { style: "thin", color: { rgb: "999999" } },
              left: { style: "thin", color: { rgb: "999999" } },
              right: { style: "thin", color: { rgb: "999999" } },
            },
            alignment: {
              horizontal: C === 3 ? "left" : "center",
              vertical: "center",
            },
          };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Backup");

  // Tạo tên file theo chuẩn với timestamp
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yearNow = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  const filename = `Backup Firestore_${year} (${day}_${month}_${yearNow} ${hours}_${minutes}).xlsx`;

  XLSX.writeFile(wb, filename);
}
