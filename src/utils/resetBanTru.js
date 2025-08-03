import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const resetBanTru = async ({
  setResetProgress,
  setResetMessage,
  setResetSeverity,
  setResetType,
  setClassData,
  getClassData,
}) => {
  const confirmed = window.confirm("⚠️ Bạn có chắc chắn muốn reset điểm danh bán trú?");
  if (!confirmed) return;

  try {
    setResetProgress(0);
    setResetMessage("");
    setResetSeverity("info");
    setResetType("dangky");

    const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
    const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

    if (!namHocValue) {
      setResetMessage("❌ Không tìm thấy năm học!");
      setResetSeverity("error");
      return;
    }

    const colName = `DANHSACH_${namHocValue}`;
    const classDocsSnap = await getDocs(collection(db, colName));

    let count = 0;
    let total = 0;
    let completed = 0;

    // 🔍 Tính tổng số học sinh cần xử lý
    for (const classDoc of classDocsSnap.docs) {
      const classData = classDoc.data();
      Object.values(classData).forEach((arr) => {
        if (Array.isArray(arr)) {
          total += arr.length;
        }
      });
    }

    // 🔄 Xử lý reset từng lớp
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

          const shouldUpdate =
            hs &&
            typeof hs === "object" &&
            hs.dangKyBanTru === true &&
            hs.diemDanhBanTru === false;

          if (shouldUpdate) {
            count++;
            setResetProgress(Math.round((completed / total) * 100));
            return {
              ...hs,
              diemDanhBanTru: true,
            };
          }

          setResetProgress(Math.round((completed / total) * 100));
          return { ...hs };
        });
      });

      newData.updatedAt = new Date().toISOString();
      await setDoc(classRef, newData);
    }

    // ✅ Cập nhật lại dữ liệu frontend
    const currentClassData = getClassData() || {};
    const updatedClassData = {};

    Object.entries(currentClassData).forEach(([classId, studentList]) => {
      if (!Array.isArray(studentList)) return;
      updatedClassData[classId] = studentList.map((s) => ({
        ...s,
        diemDanhBanTru: s.diemDanhBanTru === false ? true : s.diemDanhBanTru,
      }));
    });

    setClassData(updatedClassData);
    setResetMessage(`✅ Đã reset xong bán trú (${count} học sinh).`);
    setResetSeverity("success");
  } catch (err) {
    console.error("❌ Lỗi khi reset điểm danh bán trú:", err);
    setResetMessage("❌ Có lỗi xảy ra khi cập nhật.");
    setResetSeverity("error");
  } finally {
    setTimeout(() => setResetProgress(0), 3000);
  }
};