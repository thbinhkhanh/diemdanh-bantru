import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";


/** 🔁 Phục hồi dữ liệu từ file JSON */
export const restoreFromJSONFile = async (
  file,
  setRestoreProgress,
  setAlertMessage,
  setAlertSeverity
) => {
  try {
    if (!file) return alert("⚠️ Chưa chọn file để phục hồi!");

    const text = await file.text();
    const jsonData = JSON.parse(text);
    const collections = Object.entries(jsonData);

    // 🔍 Lấy năm học từ Firestore
    const yearDocSnap = await getDoc(doc(db, "YEAR", "NAMHOC"));
    if (!yearDocSnap.exists()) throw new Error("❌ Không tìm thấy YEAR/NAMHOC!");
    const currentNamHoc = yearDocSnap.data().value || "UNKNOWN";

    let totalDocs = 0;
    collections.forEach(([name, docs]) => {
      if (name !== "SETTINGS") {
        totalDocs += Object.keys(docs).length;
      }
    });

    let processed = 0;

    for (const [collectionName, documents] of collections) {
      if (collectionName === "SETTINGS") continue;

      // Xác định collection nào cần kiểm tra maDinhDanh
      const requiresMaDinhDanh = collectionName.startsWith("BANTRU");

      for (const [docId, docData] of Object.entries(documents)) {
        const restoredData = {};

        for (const [key, value] of Object.entries(docData)) {
          if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            const date = new Date(value);
            restoredData[key] = isNaN(date.getTime())
              ? value
              : Timestamp.fromDate(date);
          } else {
            restoredData[key] = value;
          }
        }

        if (requiresMaDinhDanh && typeof restoredData.maDinhDanh === "undefined") {
          console.warn(
            `❗ Thiếu maDinhDanh tại docId: ${docId}, collection: ${collectionName}`
          );
          continue;
        }

        await setDoc(doc(db, collectionName, docId), restoredData, { merge: true });
        processed++;
        setRestoreProgress(Math.round((processed / totalDocs) * 100));
      }
    }

    setRestoreProgress(100);
    setAlertMessage(`✅ Đã phục hồi dữ liệu năm học ${currentNamHoc} thành công!`);
    setAlertSeverity("success");
  } catch (error) {
    console.error("❌ Lỗi khi phục hồi JSON:", error);
    setAlertMessage(`❌ Lỗi khi phục hồi: ${error.message}`);
    setAlertSeverity("error");
  }
};


/** 🔁 Phục hồi dữ liệu từ Excel (.xlsx) */
export const restoreFromExcelFile = async (
  file,
  setRestoreProgress,
  setAlertMessage,
  setAlertSeverity
) => {
  try {
    if (!file) return alert("⚠️ Chưa chọn file để phục hồi!");

    setRestoreProgress(0);

    const yearDocSnap = await getDoc(doc(db, "YEAR", "NAMHOC"));
    if (!yearDocSnap.exists())
      throw new Error("❌ Không tìm thấy năm học trong Firestore (YEAR/NAMHOC)");
    const currentNamHoc = yearDocSnap.data().value;
    if (!currentNamHoc)
      throw new Error("❌ Trường value trong YEAR/NAMHOC trống.");

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      setAlertMessage("⚠️ File Excel không chứa dữ liệu.");
      setAlertSeverity("warning");
      return;
    }

    const totalRows = rows.length;
    let processed = 0;
    const collectionWithYear = `BANTRU_${currentNamHoc}`;

    for (const row of rows) {
      const { id, maDinhDanh, ...rawDoc } = row;
      if (!id || typeof maDinhDanh === "undefined") {
        console.warn("❗ Bỏ qua dòng thiếu ID hoặc maDinhDanh:", row);
        continue;
      }

      const docData = { maDinhDanh };
      const dataField = {};

      for (const [key, value] of Object.entries(rawDoc)) {
        if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(key)) {
          const normalizedDate = key.replace(/\//g, "-");
          dataField[normalizedDate] = value;
        } else if (
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}T/.test(value)
        ) {
          const date = new Date(value);
          docData[key] = isNaN(date.getTime())
            ? value
            : Timestamp.fromDate(date);
        } else {
          docData[key] = value;
        }
      }

      if (Object.keys(dataField).length > 0) {
        docData.data = dataField;
      }

      await setDoc(doc(db, collectionWithYear, id.toString()), docData, {
        merge: true,
      });
      processed++;
      setRestoreProgress(Math.round((processed / totalRows) * 100));
    }

    setRestoreProgress(100);
    setTimeout(() => {
      setAlertMessage(`✅ Đã phục hồi dữ liệu năm học ${currentNamHoc} thành công!`);
      setAlertSeverity("success");
    }, 500);
  } catch (error) {
    console.error("❌ Lỗi khi phục hồi Excel:", error);
    setAlertMessage(`❌ Lỗi khi phục hồi: ${error.message}`);
    setAlertSeverity("error");
  }
};
