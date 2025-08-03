import { doc, getDoc } from 'firebase/firestore';

export const fetchAllClassList = async ({
  namHoc,
  khoiList = [],
  getClassList,
  setClassListForKhoi,
  setTatCaLopTrongTruong,
  db,
}) => {
  if (!namHoc || khoiList.length === 0) return;

  const allClasses = [];

  for (const khoi of khoiList) {
    let lopList = getClassList(khoi);

    if (lopList.length === 0) {
      try {
        const docRef = doc(db, `CLASSLIST_${namHoc}`, khoi);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          lopList = docSnap.data()?.list || [];
          setClassListForKhoi(khoi, lopList); // ✅ Ghi theo khối vào context
          console.log(`✅ Đã lưu lớp cho khối ${khoi}:`, lopList);
        } else {
          console.warn(`⚠️ Không tìm thấy lớp cho ${khoi}`);
          lopList = [];
        }
      } catch (err) {
        console.error(`🔥 Lỗi khi lấy lớp cho ${khoi}:`, err.message);
        lopList = [];
      }
    }

    allClasses.push(...lopList.map((lop) => ({ khoi, ten: lop })));
  }

  // ✅ Ghi toàn bộ danh sách vào state component nếu cần dùng chung
  setTatCaLopTrongTruong(allClasses);
};