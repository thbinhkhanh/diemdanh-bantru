import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const saveMultipleDiemDanh = async (
  students,
  namHoc,
  today,
  selectedClass,
  classData,
  setClassData
) => {
  const diemDanhCol = `DIEMDANH_${namHoc}`;
  const danhSachCol = `DANHSACH_${namHoc}`;
  const thang = today.slice(0, 7); // yyyy-mm
  const nam = today.slice(0, 4);  // yyyy

  const updates = students.map(async (s) => {
    const docId = `${s.maDinhDanh}_${today}`;
    const diemDanhRef = doc(db, diemDanhCol, docId);
    const danhSachRef = doc(db, danhSachCol, s.maDinhDanh);

    try {
      if (!s.diemDanh) {
        // ✅ Vắng → Ghi điểm danh + cập nhật DANHSACH
        const phep = s.vangCoPhep === 'có phép';

        await Promise.all([
          setDoc(diemDanhRef, {
            maDinhDanh: s.maDinhDanh,
            hoTen: s.hoVaTen || '',
            lop: s.lop || '',
            khoi: s.khoi || '',
            ngay: today,
            thang,
            nam,
            lyDo: s.lyDo || '',
            phep: phep,
          }),
          updateDoc(danhSachRef, {
            lyDo: s.lyDo || '',
            phep: phep,
          }),
        ]);
      } else {
        // ✅ Có mặt → Xoá điểm danh (nếu có) + reset DANHSACH
        await Promise.all([
          deleteDoc(diemDanhRef),
          updateDoc(danhSachRef, {
            lyDo: '',
            phep: null,
          }),
        ]);
      }
    } catch (err) {
      console.warn(`❌ Lỗi ghi điểm danh học sinh ${s.id}:`, err.message);
      throw err;
    }
  });

  await Promise.all(updates);

  // 🔄 Gộp lại context
  const fullList = classData[selectedClass] || [];
  const changedMap = new Map(students.map((s) => [s.id, s]));
  const merged = fullList.map((s) => changedMap.get(s.id) || s);

  setClassData(selectedClass, merged);
};
