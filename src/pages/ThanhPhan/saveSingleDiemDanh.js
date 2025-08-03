import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Ghi trạng thái điểm danh của một học sinh vào Firestore
 * - Cập nhật danh sách lớp: DANHSACH_<namHoc>
 * - Ghi hoặc xoá bản điểm danh riêng: DIEMDANH_<namHoc>
 */
export const saveSingleDiemDanh = async (
  student,
  namHoc,
  selectedClass
) => {
  try {
    // ⏱️ Lấy giờ Việt Nam
    const now = new Date();
    const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const today = vietnamTime.toISOString().split('T')[0]; // yyyy-mm-dd
    const thang = today.slice(0, 7); // yyyy-mm
    const nam = today.slice(0, 4);   // yyyy

    // 🔗 Firestore reference
    const danhSachRef = doc(db, `DANHSACH_${namHoc}`, selectedClass);
    const diemDanhRef = doc(
      db,
      `DIEMDANH_${namHoc}`,
      `${student.maDinhDanh || student.id}_${today}`
    );

    // 📌 Lý do và trạng thái phép
    const lyDoGhi = (student.lyDo || '').trim() || 'Không rõ lý do';
    const phep = student.vangCoPhep === 'có phép';

    // 🧾 Đọc danh sách lớp
    const snap = await getDoc(danhSachRef);
    if (!snap.exists()) {
      console.warn(`⚠️ Không tìm thấy lớp ${selectedClass}`);
      return;
    }

    const data = snap.data();
    const hocSinh = data.hocSinh || [];

    // 🔄 Cập nhật học sinh
    const updatedHocSinh = hocSinh.map(hs => {
      const studentId = student.maDinhDanh || student.id;
      const hsId = hs.id || hs.maDinhDanh;
      if (hsId !== studentId) return hs;

      const updated = { ...hs };
      if (student.diemDanh === true) {
        delete updated.lyDo;
        delete updated.phep;
      } else {
        updated.lyDo = lyDoGhi;
        updated.phep = phep;
      }
      updated.diemDanh = student.diemDanh ?? false;
      return updated;
    });

    // ☁️ Ghi lại danh sách lớp
    await setDoc(danhSachRef, {
      ...data,
      hocSinh: updatedHocSinh,
      updatedAt: vietnamTime.toISOString(),
    });

    // 📌 Ghi hoặc xoá bản điểm danh riêng
    if (student.diemDanh === false) {
      await setDoc(diemDanhRef, {
        maDinhDanh: student.maDinhDanh || student.id,
        hoVaTen: student.hoVaTen || '',
        lop: student.lop || '',
        khoi: student.khoi || '',
        ngay: today,
        thang,
        nam,
        lyDo: lyDoGhi,
        phep,
      });
    } else {
      await deleteDoc(diemDanhRef);
    }
  } catch (err) {
    console.error(`❌ Lỗi ghi điểm danh cho ${student.maDinhDanh}:`, err.message);
    throw err;
  }
};