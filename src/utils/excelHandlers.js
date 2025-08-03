import { doc, getDoc, writeBatch } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase";

export const updateTeacherNamesFromFile = async (
  file,
  setTeacherProgress,
  setMessage,
  setSeverity,
  setUpdateTeacherName
) => {
  if (!file) {
    setMessage("❗ Vui lòng chọn file Excel hợp lệ.");
    setSeverity("error");
    return;
  }

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const expectedHeaders = ["STT", "HỌ VÀ TÊN", "LỚP"];
      const headerRow = Object.keys(jsonData[0] || {});
      const isValid = expectedHeaders.every((h) => headerRow.includes(h));

      if (!isValid) {
        setMessage("❌ File Excel không đúng định dạng yêu cầu.");
        setSeverity("error");
        return;
      }

      const total = jsonData.length;
      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;

      const BATCH_LIMIT = 500;
      let batch = writeBatch(db);
      let opsInBatch = 0;

      for (let i = 0; i < total; i++) {
        const row = jsonData[i];
        const lop = row["LỚP"]?.toString().trim().toUpperCase();
        const hoTenGoc = row["HỌ VÀ TÊN"]?.toString().trim();

        if (!lop || !hoTenGoc) continue;

        const expectedHoTen = hoTenGoc.toUpperCase();
        const ref = doc(db, "ACCOUNT", lop);

        try {
          const existing = await getDoc(ref);
          if (existing.exists()) {
            const currentHoTen = (existing.data().hoTen || "").toUpperCase();

            if (currentHoTen !== expectedHoTen) {
              batch.update(ref, { hoTen: expectedHoTen });
              opsInBatch++;
              successCount++;
            } else {
              skipCount++;
            }
          } else {
            failCount++;
          }
        } catch (err) {
          console.error("Lỗi xử lý lớp:", lop, err);
          failCount++;
        }

        // Commit nếu đủ giới hạn 500
        if (opsInBatch === BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          opsInBatch = 0;
        }

        const percent = Math.round(((i + 1) / total) * 100);
        setTeacherProgress(percent);
      }

      // Commit nốt nếu còn lại
      if (opsInBatch > 0) {
        await batch.commit();
      }

      setMessage(`✅ Đã cập nhật ${successCount} giáo viên. 🚫 Bỏ qua ${skipCount}. ❌ Lỗi ${failCount}.`);
      setSeverity("success");
    } catch (err) {
      console.error("❌ Lỗi đọc file:", err);
      setMessage("❌ Lỗi khi xử lý file Excel.");
      setSeverity("error");
    } finally {
      setTimeout(() => setTeacherProgress(0), 3000);
      if (setUpdateTeacherName) setUpdateTeacherName(false);
    }
  };

  reader.readAsArrayBuffer(file);
};
