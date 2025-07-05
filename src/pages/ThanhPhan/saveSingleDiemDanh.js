import { doc, updateDoc, deleteField, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const saveSingleDiemDanh = async (student, namHoc) => {
  const now = new Date();
  const vietnamOffsetMs = 7 * 60 * 60 * 1000;
  const vietnamNow = new Date(now.getTime() + vietnamOffsetMs);
  const today = vietnamNow.toISOString().split('T')[0]; // yyyy-mm-dd theo giờ VN

  const docRef = doc(db, `BANTRU_${namHoc}`, student.id);
  const nhatKyRef = doc(db, `NHATKY_${namHoc}`, today); // Document là ngày điểm danh (giờ VN)

  try {
    if (!student.diemDanh) {
      // ✅ Học sinh VẮNG
      const value =
        student.vangCoPhep === 'có phép' ? 'P' :
        student.vangCoPhep === 'không phép' ? 'K' :
        '';

      // Ghi điểm danh vào BANTRU_${namHoc}
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
          ngay: today
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
