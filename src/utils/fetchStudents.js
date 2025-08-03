// src/utils/fetchStudents.js
import { doc, getDoc } from "firebase/firestore";
import { enrichStudents } from "../pages/ThanhPhan/enrichStudents";
import { MySort } from "./MySort"; // giả sử MySort nằm cùng thư mục utils

export async function fetchStudents({
  db,
  namHoc,
  selectedClass,
  classData,
  fetchedClasses,
  setStudents,
  setClassData,
  setOriginalRegistered,
  setFetchedClasses,
  setIsLoading,
}) {
  const contextData = classData[selectedClass];
  const alreadyFetched = fetchedClasses[selectedClass];
  const shouldFetch = !Array.isArray(contextData) || contextData.length === 0;

  if (!shouldFetch || alreadyFetched || !namHoc || !selectedClass) {
    return;
  }

  setIsLoading(true);
  try {
    const col = `DANHSACH_${namHoc}`;
    const docRef = doc(db, col, selectedClass);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      console.warn(`⚠️ Không tìm thấy document lớp ${selectedClass} trong ${col}`);
      return;
    }

    const data = snap.data();
    const raw = data.hocSinh || [];
    const enriched = enrichStudents(raw, selectedClass, true);
    const sorted = MySort(enriched);

    setStudents(sorted);
    setClassData(selectedClass, sorted);

    const initMap = {};
    sorted.forEach(s => (initMap[s.id] = s.registered));
    setOriginalRegistered(initMap);

    setFetchedClasses(prev => ({ ...prev, [selectedClass]: true }));
  } catch (err) {
    console.error("🔥 Lỗi khi fetch học sinh:", err.message || err);
  } finally {
    setIsLoading(false);
  }
}