import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * @param {Array} students - Danh sách học sinh đã chỉnh sửa
 * @param {string} namHoc - Niên học (dùng để xác định collection Firestore)
 * @param {string} selectedClass - Lớp hiện tại (dùng để cập nhật context)
 * @param {function} setClassData - Hàm để ghi danh sách mới vào context
 * @param {object} classData - Danh sách đầy đủ của lớp từ context
 */
export const saveRegistrationChanges = async (students, namHoc, selectedClass, setClassData, classData) => {
  const col = `BANTRU_${namHoc}`;

  const updates = students.map(async (s) => {
    const ref = doc(db, col, s.id);
    const value = s.registered ? 'T' : '';

    try {
      await updateDoc(ref, { huyDangKy: value });
    } catch (err) {
      console.warn(`❌ Lỗi cập nhật học sinh ${s.id}:`, err.message);
      throw err;
    }
  });

  await Promise.all(updates);

  // 🔁 Gộp vào danh sách đầy đủ
  const fullList = classData[selectedClass] || [];

  const changedMap = new Map(students.map(s => [s.id, s]));
  const mergedList = fullList.map(s => changedMap.get(s.id) || s);

  // ✅ Ghi lại context bằng danh sách đầy đủ đã cập nhật
  setClassData(selectedClass, mergedList);
  //console.log(`✅ Đã cập nhật context lớp ${selectedClass} (ghi đầy đủ ${mergedList.length} học sinh)`);
};