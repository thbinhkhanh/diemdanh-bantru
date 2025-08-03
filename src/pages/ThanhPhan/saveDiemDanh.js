import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Ghi điểm danh nhiều học sinh và cập nhật lại context
 */
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
  const thang = today.slice(0, 7);
  const nam = today.slice(0, 4);

  // ✅ Ghi riêng từng học sinh vào DIEMDANH như cũ
  const updates = students.map(async (s) => {
    const docId = `${s.maDinhDanh}_${today}`;
    const diemDanhRef = doc(db, diemDanhCol, docId);

    try {
      if (!s.diemDanh) {
        const phep = s.vangCoPhep === 'có phép';
        await setDoc(diemDanhRef, {
          maDinhDanh: s.maDinhDanh,
          hoTen: s.hoVaTen || '',
          lop: s.lop || '',
          khoi: s.khoi || '',
          ngay: today,
          thang,
          nam,
          lyDo: s.lyDo?.trim() || '',
          phep
        });
      } else {
        await deleteDoc(diemDanhRef);
      }
    } catch (err) {
      console.warn(`❌ Lỗi ghi điểm danh học sinh ${s.id}:`, err.message);
      throw err;
    }
  });

  await Promise.all(updates);

  // ✅ Cập nhật trạng thái trực tiếp trong document lớp
  const danhSachRef = doc(db, danhSachCol, selectedClass);
  const snap = await getDoc(danhSachRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const hocSinh = data.hocSinh || [];

  const updatedHocSinh = hocSinh.map(hs => {
    const matched = students.find(s => s.id === hs.id || s.maDinhDanh === hs.id);
    if (!matched) return hs;
    return !matched.diemDanh
      ? {
          ...hs,
          phep: matched.vangCoPhep === 'có phép',
          lyDo: matched.lyDo?.trim() || 'Không rõ lý do'
        }
      : {
          ...hs,
          phep: null,
          lyDo: ''
        };
  });

  await setDoc(danhSachRef, {
    ...data,
    hocSinh: updatedHocSinh,
    updatedAt: new Date().toISOString()
  });

  // 🔄 Cập nhật lại context hiển thị
  const fullList = classData[selectedClass] || [];
  const changedMap = new Map(students.map((s) => [s.id, s]));
  const merged = fullList.map((s) => changedMap.get(s.id) || s);
  setClassData(selectedClass, merged);
};