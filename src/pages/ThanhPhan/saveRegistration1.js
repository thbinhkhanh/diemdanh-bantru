import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const saveRegistrationChanges = async (
  students,
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

    // 📌 Map ID → trạng thái registered từ UI
    const regMap = new Map(
      students.map(s => [
        s.maDinhDanh || s.id,
        !!s.registered // đảm bảo boolean
      ])
    );

    // 🔄 Duyệt và cập nhật tất cả field mảng học sinh trong tài liệu lớp
    const newData = { ...data };
    Object.entries(data).forEach(([key, value]) => {
      if (!Array.isArray(value)) return;

      newData[key] = value.map(hs => {
        const reg = regMap.get(hs.maDinhDanh || hs.id);
        return reg !== undefined
          ? { ...hs, diemDanhBanTru: reg }
          : { ...hs };
      });
    });

    newData.updatedAt = new Date().toISOString();

    await setDoc(classRef, newData);

    // 🧠 Trộn lại để cập nhật lại context hoặc state nếu cần
    const mergedList = students.map(s => ({
      ...s,
      hoVaTen: s.hoVaTen || s.hoTen || 'Không có tên',
      registered: !!s.registered
    }));

    // Nếu cần cập nhật lại UI thì bỏ comment này
    setClassData(selectedClass, mergedList);
  } catch (err) {
    console.error('❌ Lỗi khi lưu dữ liệu bán trú:', err);
  }
};