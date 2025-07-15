import { doc, deleteDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Ghi điểm danh 1 học sinh và cập nhật lại context
 * 
 * @param {object} student - Học sinh cần lưu
 * @param {string} namHoc - Ví dụ "2024-2025"
 * @param {string} selectedClass - Lớp hiện tại, ví dụ "1A"
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
  const today = vietnamNow.toISOString().split('T')[0]; // yyyy-mm-dd
  const thang = today.slice(0, 7); // yyyy-mm
  const nam = today.slice(0, 4); // yyyy

  const collectionName = `DIEMDANH_${namHoc}`;
  const docId = `${student.maDinhDanh}_${today}`;
  const diemDanhRef = doc(db, collectionName, docId);
  const danhSachRef = doc(db, `DANHSACH_${namHoc}`, student.maDinhDanh);

  const lyDoGhi = student.lyDo?.trim() || 'Không rõ lý do';
  const phep = student.vangCoPhep === 'có phép';

  try {
    if (!student.diemDanh) {
      // ✅ Vắng → Ghi điểm danh + cập nhật DANHSACH
      await Promise.all([
        setDoc(diemDanhRef, {
          maDinhDanh: student.maDinhDanh,
          hoTen: student.hoVaTen || '',
          lop: student.lop || '',
          khoi: student.khoi || '',
          ngay: today,
          thang,
          nam,
          lyDo: lyDoGhi,
          phep,
        }),
        updateDoc(danhSachRef, {
          lyDo: lyDoGhi,
          phep,
        }),
      ]);
    } else {
      // ✅ Có mặt → Xoá điểm danh + reset DANHSACH
      await Promise.all([
        deleteDoc(diemDanhRef),
        updateDoc(danhSachRef, {
          lyDo: '',
          //phep: null,
          phep: deleteField(), // ✅ xoá hoàn toàn field "phep"
        }),
      ]);
    }

    // ✅ Cập nhật lại context
    const fullList = classData[selectedClass] || [];
    const merged = fullList.map((s) => s.id === student.id ? student : s);
    setClassData(selectedClass, merged);
  } catch (err) {
    console.error(`❌ Lỗi khi lưu điểm danh học sinh ${student.id}:`, err.message);
    throw err;
  }
};
