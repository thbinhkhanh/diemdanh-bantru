import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Cập nhật huyDangKy cho từng học sinh trong DANHSACH_{namHoc}
 */
export const saveRegistrationChanges = async (students, namHoc, selectedClass, setClassData, classData) => {
  const col = `DANHSACH_${namHoc}`;

  const updates = students.map(async (s) => {
    const id = s.maDinhDanh || s.id;
    const value = s.registered ? 'T' : '';
    const ref = doc(db, col, id);

    try {
      await updateDoc(ref, { huyDangKy: value });
    } catch (err) {
      // Bỏ log lỗi theo yêu cầu
    }
  });

  await Promise.all(updates);

  // 🔁 Cập nhật lại context
  const fullList = classData[selectedClass] || [];
  const changedMap = new Map(students.map(s => [s.maDinhDanh || s.id, s]));
  const mergedList = fullList.map(s => changedMap.get(s.maDinhDanh || s.id) || s);

  setClassData(selectedClass, mergedList);
};
