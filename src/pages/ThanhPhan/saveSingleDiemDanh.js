import { doc, updateDoc, deleteField, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const saveSingleDiemDanh = async (student, namHoc) => {
  const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
  const docRef = doc(db, `BANTRU_${namHoc}`, student.id);
  const nhatKyRef = doc(db, `NHATKY_${namHoc}`, today); // Document là ngày điểm danh

  try {
    if (!student.diemDanh) {
      // ✅ Học sinh VẮNG
      const value =
        student.vangCoPhep === 'có phép' ? 'P' :
        student.vangCoPhep === 'không phép' ? 'K' :
        '';

      // Ghi điểm danh vào BANTRU_${namHoc}, gộp loai + lydo trong Diemdanh
      await updateDoc(docRef, {
        [`Diemdanh.${today}`]: {
          loai: value,
          lydo: student.lyDo || '',
        },
        vang: 'x',
        lyDo: student.lyDo || '',
      });

      // Ghi vào nhật ký theo ngày
      await setDoc(nhatKyRef, {
        [student.id]: {
          hoTen: student.hoVaTen || '',
          lop: student.lop || '',
          loai: value,
          lydo: student.lyDo || '',
        },
      }, { merge: true });

    } else {
      // ✅ Học sinh đi học lại → xoá dữ liệu ngày hôm nay

      await updateDoc(docRef, {
        [`Diemdanh.${today}`]: deleteField(),
        lyDo: deleteField(),
        vang: '',
      });

      await updateDoc(nhatKyRef, {
        [student.id]: deleteField(),
      });
    }
  } catch (err) {
    console.error(`Lỗi khi lưu điểm danh học sinh ${student.id}:`, err.message);
    throw err;
  }
};
