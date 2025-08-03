import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/** 📘 Format và xuất dữ liệu ra file Excel gồm nhiều sheet */
export async function formatMultiSheetExcel(sheetDataMap, filename) {
  const workbook = new ExcelJS.Workbook();

  for (const [sheetName, { headers, rows }] of Object.entries(sheetDataMap)) {
    const sheet = workbook.addWorksheet(sheetName);

    sheet.addRow(headers);

    rows.forEach((row) => {
      sheet.addRow(row);
    });

    // Styling cho sheet
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => {
      col.width = 15;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}