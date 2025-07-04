// utils/xoaTatCaDiemDanh.js
import { getDoc, doc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const xoaTatCaDiemDanh = async () => {
  const confirmed = window.confirm("⚠️ Bạn có chắc muốn xóa tất cả dữ liệu điểm danh không?");
  if (!confirmed) return;

  try {
    const yearSnap = await getDoc(doc(db, "YEAR", "NAMHOC"));
    const year = yearSnap.exists() ? yearSnap.data().value : null;
    if (!year) throw new Error("Không tìm thấy năm học hiện tại");

    const colRef = collection(db, `BANTRU_${year}`);
    const snapshot = await getDocs(colRef);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      delete data.vang;
      delete data.lyDo;

      await setDoc(doc(db, `BANTRU_${year}`, docSnap.id), data);
    }

    alert("✅ Đã xóa toàn bộ dữ liệu điểm danh.");
  } catch (error) {
    console.error("❌ Lỗi khi xóa dữ liệu điểm danh:", error);
    alert("❌ Lỗi khi xóa dữ liệu điểm danh.");
  }
};
