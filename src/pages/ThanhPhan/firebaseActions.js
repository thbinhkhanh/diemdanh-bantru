// src/firebaseActions.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * Cập nhật trạng thái registered của học sinh trong 1 lớp
 */
export const saveRegistrationChanges = async (students, namHoc, selectedClass) => {
  const docRef = doc(db, `DANHSACH_${namHoc}`, selectedClass);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const hocSinh = data.hocSinh || [];

  const regMap = new Map(
    students.map(s => [s.id || s.maDinhDanh, !!s.registered])
  );

  const updatedHocSinh = hocSinh.map(hs => {
    const value = regMap.get(hs.id);
    return value !== undefined ? { ...hs, registered: value } : hs;
  });

  await setDoc(docRef, {
    ...data,
    hocSinh: updatedHocSinh,
    updatedAt: new Date().toISOString()
  });
};

// Lưu điểm danh nhiều học sinh
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * Cập nhật điểm danh cho lớp theo ngày
 */
export const saveMultipleDiemDanh = async (absentStudents, namHoc, selectedClass, date) => {
  const docRef = doc(db, `DANHSACH_${namHoc}`, selectedClass);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const hocSinh = data.hocSinh || [];

  const formattedDate = date.toISOString().split("T")[0];

  // Map ID → dữ liệu điểm danh
  const diemDanhMap = new Map(
    absentStudents.map(s => [s.id, {
      phep: s.vangCoPhep === "có phép",
      lyDo: s.lyDo || ""
    }])
  );

  const updatedHocSinh = hocSinh.map(hs => {
    const dd = diemDanhMap.get(hs.id);
    if (dd) {
      return {
        ...hs,
        phep: dd.phep,
        lyDo: dd.lyDo
      };
    }
    return hs;
  });

  await setDoc(docRef, {
    ...data,
    hocSinh: updatedHocSinh,
    updatedAt: new Date().toISOString()
  });
};
