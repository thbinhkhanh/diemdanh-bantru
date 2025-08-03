import { doc, getDoc } from 'firebase/firestore';

/**
 * Fetch danh sách lớp cho khối được chỉ định từ cache hoặc Firebase.
 * @param {string} namHoc - Năm học hiện tại.
 * @param {string} khoi - Mã khối lớp (ví dụ: 'K1').
 * @param {Function} getClassList - Hàm lấy danh sách lớp từ cache.
 * @param {Function} setClassList - Hàm cập nhật danh sách lớp vào state.
 * @param {Function} setClassListForKhoi - Hàm lưu danh sách lớp vào context.
 * @param {Function} setSelectedClass - Hàm cập nhật lớp được chọn.
 * @param {object} location - React Router location object để kiểm tra state.lop.
 * @param {object} db - Firebase Firestore instance.
 */
export const fetchClassList = async ({
  namHoc,
  //khoi = 'K1',
  khoi,
  getClassList,
  setClassList,
  setClassListForKhoi,
  setSelectedClass,
  location,
  db,
}) => {
  if (!namHoc) return;

  const cachedList = getClassList(khoi);

  if (cachedList.length > 0) {
    setClassList(cachedList);
    const lopFromState = location.state?.lop;
    if (lopFromState && cachedList.includes(lopFromState)) {
      setSelectedClass(lopFromState);
    } else {
      setSelectedClass(cachedList[0]);
    }
    return;
  }

  try {
    const docRef = doc(db, `CLASSLIST_${namHoc}`, khoi);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const list = data.list || [];

      setClassList(list);
      setClassListForKhoi(khoi, list);

      const lopFromState = location.state?.lop;
      if (lopFromState && list.includes(lopFromState)) {
        setSelectedClass(lopFromState);
      } else if (list.length > 0) {
        setSelectedClass(list[0]);
      }
    }
  } catch (err) {
    console.error('Lỗi khi tải danh sách lớp:', err.message);
  }
};