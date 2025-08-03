import {
  collection,
  doc,
  getDocs,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx"; // ← Có thể bỏ nếu không dùng Excel trong hàm này

/** 🔁 Phục hồi dữ liệu từ file JSON */
export const restoreFromJSONFile = async (
  file,
  setRestoreProgress,
  setAlertMessage,
  setAlertSeverity,
  selectedDataTypes,
  restoreMode
) => {
  try {
    if (!file) return alert("⚠️ Chưa chọn file để phục hồi!");

    const text = await file.text();
    const jsonData = JSON.parse(text);
    const collections = Object.entries(jsonData);

    const allowedPrefixes = [];
    if (selectedDataTypes.danhsach) allowedPrefixes.push("DANHSACH");
    if (selectedDataTypes.bantru) allowedPrefixes.push("BANTRU");
    if (selectedDataTypes.diemdan) allowedPrefixes.push("DIEMDANH");
    if (selectedDataTypes.nhatky) allowedPrefixes.push("NHATKYBANTRU");

    if (allowedPrefixes.length === 0) {
      alert("⚠️ Bạn chưa chọn loại dữ liệu nào để phục hồi!");
      return;
    }

    let totalDocs = 0;
    collections.forEach(([collectionName, docs]) => {
      if (allowedPrefixes.some(prefix => collectionName.startsWith(prefix))) {
        totalDocs += Object.keys(docs).length;
      }
    });

    let processed = 0;
    let addedCount = 0;
    let skippedCount = 0;

    for (const [collectionName, documents] of collections) {
      if (!allowedPrefixes.some(prefix => collectionName.startsWith(prefix))) {
        console.info(`🚫 Bỏ qua collection không được chọn: ${collectionName}`);
        continue;
      }

      console.group(`📂 Phục hồi collection: ${collectionName}`);
      const onlyAddNew = restoreMode === "check";

      // ✅ Dùng getDocs để lấy danh sách ID đã tồn tại
      const existingIds = onlyAddNew
        ? new Set((await getDocs(collection(db, collectionName))).docs.map(doc => doc.id))
        : new Set();

      const batchOps = [];

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

        if (onlyAddNew && existingIds.has(docId)) {
          skippedCount++;
          processed++;
          setRestoreProgress(Math.round((processed / totalDocs) * 100));
          continue;
        }

        batchOps.push({ docRef: doc(db, collectionName, docId), data: restoredData });

        addedCount++;
        processed++;
        setRestoreProgress(Math.round((processed / totalDocs) * 100));
        console.log(`➕ Thêm mới: ${collectionName}/${docId}`, restoredData.maDinhDanh || restoredData.name || docId);
      }

      for (let i = 0; i < batchOps.length; i += 500) {
        const chunk = batchOps.slice(i, i + 500);
        const batch = writeBatch(db);
        chunk.forEach(({ docRef, data }) => {
          batch.set(docRef, data, { merge: true });
        });
        await batch.commit();
      }

      console.groupEnd();
    }

    setRestoreProgress(100);

    const message =
      addedCount > 0
        ? `✅ Đã phục hồi ${addedCount} dòng dữ liệu.`
        : `📎 Không có dữ liệu mới để phục hồi.`;

    const skipNote =
      skippedCount > 0
        ? `🔁 Bỏ qua ${skippedCount} dòng đã tồn tại.`
        : "";

    setAlertMessage(`${message} ${skipNote}`.trim());
    setAlertSeverity(addedCount > 0 ? "success" : "info");

  } catch (error) {
    console.error("❌ Lỗi khi phục hồi JSON:", error);
    setAlertMessage(`❌ Lỗi khi phục hồi: ${error.message}`);
    setAlertSeverity("error");
  }
};

export const restoreFromExcelFile = async (
  file,
  setRestoreProgress,
  setAlertMessage,
  setAlertSeverity,
  selectedDataTypes,
  restoreMode // "all" hoặc "check"
) => {
  try {
    if (!file) return alert("⚠️ Chưa chọn file để phục hồi!");

    const prefixMap = {
      bantru: "BANTRU",
      danhsach: "DANHSACH",
      diemdan: "DIEMDANH",
      // Bạn có thể thêm: khaosat, tongket, gopy...
    };

    const selectedPrefixes = Object.entries(prefixMap)
      .filter(([key]) => selectedDataTypes[key])
      .map(([, prefix]) => prefix);

    if (selectedPrefixes.length === 0) {
      alert("⚠️ Bạn chưa chọn loại dữ liệu nào để phục hồi!");
      return;
    }

    setRestoreProgress(0);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    let totalSheets = workbook.SheetNames.length;
    let addedCount = 0;
    let skippedCount = 0;
    let processed = 0;
    let totalRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const [prefix, namHoc] = sheetName.split("_");

      if (!selectedPrefixes.includes(prefix) || !namHoc) continue;

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (!rows || rows.length === 0) continue;

      const collectionWithYear = `${prefix}_${namHoc}`;
      const onlyAddNew = restoreMode === "check";

      const existingIds = onlyAddNew
        ? new Set((await getDocs(collection(db, collectionWithYear))).docs.map(doc => doc.id))
        : new Set();

      totalRows += rows.length;
      const docsToWrite = [];

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
          } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            const date = new Date(value);
            docData[key] = isNaN(date.getTime()) ? value : Timestamp.fromDate(date);
          } else {
            docData[key] = value;
          }
        }

        if (Object.keys(dataField).length > 0) {
          docData.data = dataField;
        }

        const docId = id.toString();

        if (onlyAddNew && existingIds.has(docId)) {
          skippedCount++;
          processed++;
          setRestoreProgress(Math.round((processed / totalRows) * 100));
          continue;
        }

        docsToWrite.push({ docRef: doc(db, collectionWithYear, docId), data: docData });
        addedCount++;
        processed++;
        setRestoreProgress(Math.round((processed / totalRows) * 100));
        console.log(`➕ [${prefix}] ${collectionWithYear}/${docId}`, docData);
      }

      for (let i = 0; i < docsToWrite.length; i += 500) {
        const chunk = docsToWrite.slice(i, i + 500);
        const batch = writeBatch(db);
        chunk.forEach(({ docRef, data }) => {
          batch.set(docRef, data, { merge: true });
        });
        await batch.commit();
      }
    }

    setRestoreProgress(100);

    const message = addedCount > 0
      ? `✅ Đã phục hồi ${addedCount} dòng dữ liệu từ ${totalSheets} sheet.`
      : `📎 Không có dữ liệu mới để phục hồi.`;

    const skipNote = skippedCount > 0
      ? `🔁 Bỏ qua ${skippedCount} dòng đã tồn tại.`
      : "";

    setTimeout(() => {
      setAlertMessage(`${message} ${skipNote}`.trim());
      setAlertSeverity(addedCount > 0 ? "success" : "info");
    }, 500);

  } catch (error) {
    console.error("❌ Lỗi khi phục hồi Excel:", error);
    setAlertMessage(`❌ Lỗi khi phục hồi: ${error.message}`);
    setAlertSeverity("error");
  }
};