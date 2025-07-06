import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * @param {Array} students - Danh sách học sinh bị vắng
 * @param {string} namHoc - Niên học (ví dụ "2025")
 * @param {string} today - Ngày điểm danh (yyyy-mm-dd)
 * @param {string} selectedClass - Lớp hiện tại
 * @param {object} classData - Context classDataMap đầy đủ
 * @param {function} setClassData - Hàm cập nhật context
 */
export const saveMultipleDiemDanh = async (
  students,
  namHoc,
  today,
  selectedClass,
  classData,
  setClassData
) => {
  const col = `BANTRU_${namHoc}`;

  const updates = students.map((s) => {
    const value =
      s.vangCoPhep === 'có phép'
        ? 'P'
        : s.vangCoPhep === 'không phép'
        ? 'K'
        : '';

    const update = {
      [`Diemdanh.${today}`]: value,
      [`LyDoVang.${today}`]: s.lyDo || '',
      vang: 'x',
    };

    return updateDoc(doc(db, col, s.id), update).catch((err) => {
      console.warn(`Không thể ghi điểm danh học sinh ${s.id}:`, err.message);
      throw err;
    });
  });

  await Promise.all(updates);

  // 🔄 Merge vào context đầy đủ
  const fullList = classData[selectedClass] || [];
  const changedMap = new Map(students.map((s) => [s.id, s]));
  const merged = fullList.map((s) => changedMap.get(s.id) || s);

  setClassData(selectedClass, merged);
  //console.log(`✅ Đã cập nhật context lớp ${selectedClass} với điểm danh ngày ${today}`);
};