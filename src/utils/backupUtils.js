// 📁 backupUtils.js
import {
  collection,
  getDocs,
  Timestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { exportFormattedExcel } from "./formatExcel.js";
import * as XLSX from "xlsx";
import { formatMultiSheetExcel } from "./formatMultiSheetExcel.js";


/** 🎯 Sao lưu toàn bộ Firestore sang JSON theo năm học */
export const downloadBackupAsJSON = async (selectedDataTypes) => {
  try {
    // 🔎 Đọc năm học hiện tại từ document "YEAR/NAMHOC"
    const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
    const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

    if (!namHocValue) {
      alert("❗ Không tìm thấy năm học hợp lệ trong hệ thống!");
      return;
    }

    // 📦 Tạo danh sách tên collection cần sao lưu
    const collectionsToBackup = [];
    if (selectedDataTypes.bantru) collectionsToBackup.push(`BANTRU_${namHocValue}`);        // ✅ Sao lưu dữ liệu bán trú theo ngày
    if (selectedDataTypes.danhsach) collectionsToBackup.push(`DANHSACH_${namHocValue}`);    // ✅ Sao lưu danh sách học sinh từng lớp
    if (selectedDataTypes.diemdan) collectionsToBackup.push(`DIEMDANH_${namHocValue}`);     // ✅ Sao lưu điểm danh theo ngày
    if (selectedDataTypes.nhatky) collectionsToBackup.push(`NHATKYBANTRU_${namHocValue}`);  // ✅ Sao lưu nhật ký điều chỉnh bán trú

    if (collectionsToBackup.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để sao lưu JSON.");
      return;
    }

    const backupContent = {};

    // 🔁 Lặp qua từng collection cần sao lưu
    for (const colName of collectionsToBackup) {
      const colSnap = await getDocs(collection(db, colName));
      backupContent[colName] = {};

      // 🔁 Lặp qua từng document trong collection
      for (const docSnap of colSnap.docs) {
        const rawData = docSnap.data();
        const docId = docSnap.id;

        // 📘 Xử lý collection DANHSACH_*: danh sách học sinh lưu trong field hocSinh[]
        if (colName.startsWith("DANHSACH_") && Array.isArray(rawData.hocSinh)) {
          const cleanHocSinh = rawData.hocSinh.map((hs) => {
            const convertedHS = {};
            for (const [key, value] of Object.entries(hs)) {
              convertedHS[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
            }
            return convertedHS;
          });
          backupContent[colName][docId] = { hocSinh: cleanHocSinh };
        }

        // 📘 Xử lý collection NHATKYBANTRU_* (kiểu mảng danhSach[])
        else if (colName.startsWith("NHATKYBANTRU_") && Array.isArray(rawData.danhSach)) {
          const cleanDS = rawData.danhSach.map((item) => {
            const convertedItem = {};
            for (const [key, value] of Object.entries(item)) {
              convertedItem[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
            }
            return convertedItem;
          });

          // Giữ lại các field khác ngoài danhSach
          const otherFields = {};
          for (const [key, value] of Object.entries(rawData)) {
            if (key !== "danhSach") {
              otherFields[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
            }
          }

          backupContent[colName][docId] = { ...otherFields, danhSach: cleanDS };
        }

        // 📘 Các collection còn lại: BANTRU, DIEMDANH, hoặc NHATKY (kiểu từng học sinh) xử lý như bình thường
        else {
          const converted = {};
          for (const [key, value] of Object.entries(rawData)) {
            converted[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
          }
          backupContent[colName][docId] = converted;
        }
      }
    }

    // 💾 Tạo blob JSON và trigger download
    const blob = new Blob([JSON.stringify(backupContent, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // 🕓 Tạo tên file theo ngày giờ hiện tại
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const selectedLabels = Object.entries(selectedDataTypes)
      .filter(([_, selected]) => selected)
      .map(([key]) => key.toUpperCase());

    const labelStr = selectedLabels.join("_"); // e.g. "DANHSACH_BANTRU"

    //const filename = `Backup_${namHocValue} (${day}_${month}_${year} ${hours}_${minutes}).json`;
    const filename = `${labelStr}_Backup_${namHocValue} (${day}_${month}_${year} ${hours}_${minutes}).json`;
    link.download = filename;
    link.click();

    // 🧹 Giải phóng bộ nhớ sau khi tải xong
    setTimeout(() => URL.revokeObjectURL(url), 1000);

  } catch (error) {
    console.error("❌ Lỗi khi tạo file JSON:", error);
    alert("❌ Không thể sao lưu dữ liệu.");
  }
};

/** 📥 Sao lưu dữ liệu ra Excel (.xlsx) theo năm học */
export const downloadBackupAsExcel = async (selectedDataTypes) => {
  try {
    const prefixMap = {
      bantru: "BANTRU",
      danhsach: "DANHSACH",
      diemdan: "DIEMDANH",
      nhatky: "NHATKYBANTRU"
    };

    const selectedPrefixes = Object.entries(prefixMap)
      .filter(([key]) => selectedDataTypes[key])
      .map(([_, prefix]) => prefix);

    if (selectedPrefixes.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để sao lưu Excel.");
      return;
    }

    const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
    const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

    if (!namHocValue) {
      alert("❗ Không tìm thấy năm học hợp lệ trong hệ thống!");
      return;
    }

    const sheetDataMap = {};

    for (const prefix of selectedPrefixes) {
      const colSnap = await getDocs(collection(db, `${prefix}_${namHocValue}`));
      const rawDocs = [];

      for (const docSnap of colSnap.docs) {
        const rawData = docSnap.data();
        const converted = { id: docSnap.id };

        for (const [key, value] of Object.entries(rawData)) {
          if (value instanceof Timestamp) {
            converted[key] = value.toDate().toISOString();
          } else if (key === "data" && typeof value === "object") {
            for (const [dateStr, status] of Object.entries(value)) {
              converted[dateStr] = status;
            }
          } else {
            converted[key] = value;
          }
        }

        rawDocs.push(converted);
      }

      if (rawDocs.length === 0) continue;

      const headers = Object.keys(rawDocs[0]);
      const rows = rawDocs.map((item) => headers.map((key) => item[key]));

      sheetDataMap[`${prefix}_${namHocValue}`] = {
        headers,
        rows,
      };
    }

    // 🕓 Tạo tên file
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const selectedLabels = Object.entries(selectedDataTypes)
      .filter(([_, selected]) => selected)
      .map(([key]) => key.toUpperCase());

    const labelStr = selectedLabels.join("_");
    const filename = `${labelStr}_Backup_${namHocValue} (${day}_${month}_${year} ${hours}_${minutes}).xlsx`;

    await formatMultiSheetExcel(sheetDataMap, filename);

  } catch (error) {
    console.error("❌ Lỗi khi tạo file Excel:", error);
    alert("❌ Không thể sao lưu dữ liệu Excel.");
  }
};

