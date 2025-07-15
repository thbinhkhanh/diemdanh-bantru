import { getFirestore, doc, setDoc } from "firebase/firestore";

const db = getFirestore();

/**
 * Ghi nhật ký điểm danh vào collection NHATKY_<namHoc>
 * @param {string} ngay - Định dạng YYYY-MM-DD (ví dụ: "2025-07-01")
 * @param {string} namHoc - Ví dụ: "2024-2025"
 * @param {Array} danhSachHS - Mảng danh sách học sinh gồm: maDinhDanh, hoTen, lop, trangThai, lyDo
 */
async function ghiNhatKyDiemDanh(ngay, namHoc, danhSachHS) {
  const nhatKyRef = doc(db, `NHATKY_${namHoc}`, ngay);

  const data = {};

  danhSachHS.forEach(hs => {
    const { maDinhDanh, hoTen, lop, trangThai, lyDo } = hs;

    data[maDinhDanh] = {
      hoTen: hoTen,
      lop: lop,
      loai: trangThai === "Có mặt" ? "P" : "K",
      lydo: trangThai === "Vắng" ? (lyDo || "") : ""
    };
  });

  try {
    await setDoc(nhatKyRef, data, { merge: true });
    //console.log("🟢 Nhật ký điểm danh đã được ghi vào Firestore.");
  } catch (error) {
    console.error("🔴 Lỗi ghi nhật ký điểm danh:", error);
  }
}
