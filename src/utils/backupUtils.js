// 📁 backupUtils.js
import {
  collection,
  getDocs,
  Timestamp,
  doc,
  //setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { formatExcel_Backup } from "./formatExcel_Backup.js";


//import * as XLSX from "xlsx";

/** 🎯 Sao lưu toàn bộ Firestore sang JSON theo năm học */
export const downloadBackupAsJSON = async (selectedDataTypes) => {
  try {
    const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
    const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

    if (!namHocValue) {
      alert("❗ Không tìm thấy năm học hợp lệ trong hệ thống!");
      return;
    }

    // 🔍 Lấy tên collection theo lựa chọn
    const collectionsToBackup = [];
    if (selectedDataTypes.bantru) collectionsToBackup.push(`BANTRU_${namHocValue}`);
    if (selectedDataTypes.danhsach) collectionsToBackup.push(`DANHSACH_${namHocValue}`);
    if (selectedDataTypes.diemdan) collectionsToBackup.push(`DIEMDANH_${namHocValue}`);

    if (collectionsToBackup.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để sao lưu JSON.");
      return;
    }

    const backupContent = {};

    for (const colName of collectionsToBackup) {
      const colSnap = await getDocs(collection(db, colName));
      backupContent[colName] = {};

      for (const docSnap of colSnap.docs) {
        const rawData = docSnap.data();
        const converted = {};

        for (const [key, value] of Object.entries(rawData)) {
          converted[key] = value instanceof Timestamp
            ? value.toDate().toISOString()
            : value;
        }

        backupContent[colName][docSnap.id] = converted;
      }
    }

    const blob = new Blob([JSON.stringify(backupContent, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const filename = `Backup_${namHocValue} (${day}_${month}_${year} ${hours}_${minutes}).json`;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log("✅ Đã tạo file JSON sao lưu!");
  } catch (error) {
    console.error("❌ Lỗi khi tạo file JSON:", error);
    alert("❌ Không thể sao lưu dữ liệu.");
  }
};


/** 📥 Sao lưu dữ liệu ra Excel (.xlsx) theo năm học */
export const downloadBackupAsExcel = async (selectedDataTypes) => {
  try {
    if (!selectedDataTypes.bantru) {
      alert("⚠️ Chỉ hỗ trợ sao lưu dữ liệu Bán trú dưới dạng Excel.");
      return;
    }

    const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
    const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

    if (!namHocValue) {
      alert("❗ Không tìm thấy năm học hợp lệ trong hệ thống!");
      return;
    }

    const colSnap = await getDocs(collection(db, `BANTRU_${namHocValue}`));
    const rawDocs = [];

    for (const docSnap of colSnap.docs) {
      const rawData = docSnap.data();
      const converted = {
        id: docSnap.id,
        hoVaTen: rawData.hoVaTen || "",
        lop: rawData.lop || "",
        maDinhDanh: rawData.maDinhDanh || "",
        huyDangKy: rawData.huyDangKy || "",
        banTruNgay: {},
      };

      for (const [key, value] of Object.entries(rawData)) {
        if (value instanceof Timestamp) {
          converted[key] = value.toDate().toISOString();
        } else if (key === "data" && typeof value === "object") {
          for (const [dateStr, status] of Object.entries(value)) {
            converted.banTruNgay[dateStr] = status;
          }
        }
      }

      rawDocs.push(converted);
    }

    if (rawDocs.length === 0) {
      alert("❗ Không có dữ liệu để sao lưu.");
      return;
    }

    const dateSet = new Set();
    rawDocs.forEach((item) => {
      Object.keys(item.banTruNgay || {}).forEach((d) => dateSet.add(d));
    });

    const columnDates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
    const selectedClass = "Tất cả";

    formatExcel_Backup(rawDocs, columnDates, namHocValue, selectedClass);
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo file Excel:", error);
    alert("❌ Không thể sao lưu dữ liệu Excel.");
  }
};
