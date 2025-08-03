import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const saveRegistrationChanges = async (
  students,         // chỉ là danh sách thay đổi (không đầy đủ!)
  namHoc,
  selectedClass,
  setClassData,
  classData
) => {
  const col = `DANHSACH_${namHoc}`;
  const classRef = doc(db, col, selectedClass);

  try {
    const docSnap = await getDoc(classRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();

    // 1. Map từ UI: id => registered
    const regMap = new Map(
      students.map(s => [s.maDinhDanh || s.id, !!s.registered])
    );

    // 2. Cập nhật Firestore
    const newData = { ...data };
    Object.entries(data).forEach(([key, val]) => {
      if (!Array.isArray(val)) return;
      newData[key] = val.map(hs => {
        const id = hs.maDinhDanh || hs.id;
        if (regMap.has(id)) {
          return { ...hs, diemDanhBanTru: regMap.get(id) };
        }
        return hs;
      });
    });

    newData.updatedAt = new Date().toISOString();
    await setDoc(classRef, newData);

    // 3. ✅ Cập nhật context đúng cách: cập nhật từng học sinh trong danh sách gốc
    const fullList = classData[selectedClass] || [];
    const updatedList = fullList.map(hs => {
      const id = hs.maDinhDanh || hs.id;
      if (regMap.has(id)) {
        const registered = regMap.get(id);
        return {
          ...hs,
          diemDanhBanTru: registered,
          registered: registered, // đảm bảo sync checkbox UI
        };
      }
      return hs;
    });

    setClassData(selectedClass, updatedList);

  } catch (err) {
    console.error('❌ Lỗi khi lưu dữ liệu bán trú:', err);
  }
};
