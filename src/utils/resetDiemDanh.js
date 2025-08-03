import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

export const resetDiemDanh = async ({
  setResetProgress,
  setResetMessage,
  setResetSeverity,
  setResetType,
}) => {
  const confirmed = window.confirm("⚠️ Bạn có chắc chắn muốn reset điểm danh?");
  if (!confirmed) return;

  try {
    setResetProgress(0);
    setResetMessage("");
    setResetSeverity("info");
    setResetType("diemdanh");

    const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
    const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

    if (!namHocValue) {
      setResetMessage("❌ Không tìm thấy năm học!");
      setResetSeverity("error");
      return;
    }

    const colName = `DANHSACH_${namHocValue}`;
    const classDocsSnap = await getDocs(collection(db, colName));

    let total = 0;
    let completed = 0;
    let count = 0;

    // 🔍 Tính tổng số học sinh cần xét
    for (const classDoc of classDocsSnap.docs) {
      const classData = classDoc.data();
      Object.values(classData).forEach((arr) => {
        if (Array.isArray(arr)) {
          total += arr.length;
        }
      });
    }

    // 🔄 Xử lý reset từng lớp học
    for (const classDoc of classDocsSnap.docs) {
      const classId = classDoc.id;
      const classRef = doc(db, colName, classId);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) continue;

      const originalData = classSnap.data();
      const newData = { ...originalData };

      Object.entries(originalData).forEach(([key, value]) => {
        if (!Array.isArray(value)) return;

        newData[key] = value.map((hs) => {
          completed++;
          if (!hs || typeof hs !== "object") {
            setResetProgress(Math.round((completed / total) * 100));
            return hs;
          }

          const clone = { ...hs };
          const changed =
            hs.vang !== "" ||
            hs.lyDo !== "" ||
            typeof hs.phep === "boolean" ||
            hs.phep === null;

          if (changed) {
            count++;
            clone.vang = "";
            clone.lyDo = "";
            delete clone.phep;
          }

          setResetProgress(Math.round((completed / total) * 100));
          return clone;
        });
      });

      newData.updatedAt = new Date().toISOString();
      await setDoc(classRef, newData);
    }

    setResetMessage(`✅ Đã reset xong điểm danh (${count} học sinh).`);
    setResetSeverity("success");
  } catch (err) {
    console.error("❌ Lỗi khi reset điểm danh:", err);
    setResetMessage("❌ Có lỗi xảy ra khi cập nhật.");
    setResetSeverity("error");
  } finally {
    setTimeout(() => setResetProgress(0), 3000);
  }
};