import { doc, updateDoc, deleteField, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Ghi điểm danh 1 học sinh và cập nhật lại context
 * 
 * @param {object} student - Học sinh cần lưu
 * @param {string} namHoc - Ví dụ "2025"
 * @param {string} selectedClass - Lớp hiện tại, ví dụ "1.2"
 * @param {object} classData - context hiện tại
 * @param {function} setClassData - hàm để cập nhật context
 */
export const saveSingleDiemDanh = async (
  student,
  namHoc,
  selectedClass,
  classData,
  setClassData
) => {
  const now = new Date();
  const vietnamOffsetMs = 7 * 60 * 60 * 1000;
  const vietnamNow = new Date(now.getTime() + vietnamOffsetMs);
  const today = vietnamNow.toISOString().split('T')[0];

  const docRef = doc(db, `BANTRU_${namHoc}`, student.id);
  const nhatKyRef = doc(db, `NHATKY_${namHoc}`, today);

  try {
    if (!student.diemDanh) {
      // ✅ Vắng
      const value =
        student.vangCoPhep === 'có phép'
          ? 'P'
          : student.vangCoPhep === 'không phép'
          ? 'K'
          : '';

      await updateDoc(docRef, {
        [`Diemdanh.${today}`]: {
          loai: value,
          lydo: student.lyDo || '',
        },
        vang: 'x',
        lyDo: student.lyDo || '',
      });

      await setDoc(
        nhatKyRef,
        {
          [student.id]: {
            hoTen: student.hoVaTen || '',
            lop: student.lop || '',
            loai: value,
            lydo: student.lyDo || '',
            ngay: today,
          },
        },
        { merge: true }
      );
    } else {
      // ✅ Có mặt → xoá điểm danh
      await updateDoc(docRef, {
        [`Diemdanh.${today}`]: deleteField(),
        lyDo: deleteField(),
        vang: '',
      });

      await updateDoc(nhatKyRef, {
        [student.id]: deleteField(),
      });
    }

    // ✅ Gộp học sinh đã chỉnh vào context
    const fullList = classData[selectedClass] || [];
    const merged = fullList.map((s) =>
      s.id === student.id ? student : s
    );

    setClassData(selectedClass, merged);
    //console.log(`✅ Đã cập nhật context lớp ${selectedClass} sau khi điểm danh`);
  } catch (err) {
    console.error(`Lỗi khi lưu điểm danh học sinh ${student.id}:`, err.message);
    throw err;
  }
};