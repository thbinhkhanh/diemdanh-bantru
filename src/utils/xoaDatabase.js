import { db } from "../firebase";
import {
  collection,
  deleteDoc,
  getDocs,
  writeBatch,
  deleteField,
} from "firebase/firestore";

export const xoaDatabase = async ({
  selectedYear,
  deleteCollections,
  setDeleting,
  setProgress,
  setDeletingLabel,
  setDeleteMessage,
  setDeleteSeverity,
  setDeleteSuccess,
  setShowDeleteOptions,
  setDeleteCollections,
}) => {
  const namHocValue = selectedYear;
  const { danhsach, bantru, diemdan, nhatkybantru, xoaHocSinhBanTru } = deleteCollections;

  if (!danhsach && !bantru && !diemdan && !nhatkybantru && !xoaHocSinhBanTru) {
    alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để xóa.");
    return;
  }

  const confirmed = window.confirm("⚠️ Bạn có chắc chắn muốn xóa dữ liệu đã chọn?");
  if (!confirmed) return;

  try {
    setDeleting(true);
    setProgress(0);
    let totalDeletedCount = 0;
    let completedCount = 0;
    let totalDocsToDelete = 0;

    const keysToDelete = [];
    if (danhsach) keysToDelete.push("DANHSACH");
    if (diemdan) keysToDelete.push("DIEMDANH");
    if (bantru) keysToDelete.push("BANTRU");
    if (nhatkybantru) keysToDelete.push("NHATKYBANTRU");

    // 🔍 Tính tổng số document sẽ xóa trước
    for (const key of keysToDelete) {
      const snap = await getDocs(collection(db, `${key}_${namHocValue}`));
      totalDocsToDelete += snap.docs.length;
    }

    // Xóa từng collection
    const deleteCollectionDocs = async (key, label) => {
      setDeletingLabel(label);
      const snap = await getDocs(collection(db, `${key}_${namHocValue}`));
      for (const doc of snap.docs) {
        await deleteDoc(doc.ref);
        totalDeletedCount++;
        completedCount++;
        setProgress(Math.round((completedCount / totalDocsToDelete) * 100));
      }
    };

    for (const key of keysToDelete) {
      const labelMap = {
        DANHSACH: "Đang xóa danh sách...",
        DIEMDANH: "Đang xóa điểm danh...",
        BANTRU: "Đang xóa bán trú...",
        NHATKYBANTRU: "Đang xóa nhật ký bán trú...",
      };
      await deleteCollectionDocs(key, labelMap[key]);
    }

    // 🧹 Xử lý xóa field học sinh bán trú nếu chọn
    if (xoaHocSinhBanTru) {
      setDeletingLabel("Đang xử lý học sinh bán trú...");

      const danhSachRef = collection(db, `DANHSACH_${namHocValue}`);
      const banTruRef = collection(db, `BANTRU_${namHocValue}`);

      const [danhSachSnap, banTruSnap] = await Promise.all([
        getDocs(danhSachRef),
        getDocs(banTruRef),
      ]);

      const hocSinhCanKiemTra = [];
      danhSachSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.dangKyBanTru === false) {
          hocSinhCanKiemTra.push({
            id: docSnap.id,
            ref: docSnap.ref,
            hoTen: data.hoVaTen || "(Không có tên)",
          });
        }
      });

      // Tăng tổng tiến trình nếu có học sinh cần xử lý
      totalDocsToDelete += hocSinhCanKiemTra.length;

      const banTruIDs = new Set(banTruSnap.docs.map((doc) => doc.id));
      const batch = writeBatch(db);
      let count = 0;

      hocSinhCanKiemTra.forEach(({ id, ref }) => {
        if (!banTruIDs.has(id)) {
          batch.update(ref, {
            dangKyBanTru: deleteField(),
            diemDanhBanTru: deleteField(),
          });
          count++;
          totalDeletedCount++;
          completedCount++;
          setProgress(Math.round((completedCount / totalDocsToDelete) * 100));
        }
      });

      await batch.commit();
      setDeleteMessage(`✅ Đã xoá field bán trú của ${count} học sinh.`);
      setDeleteSeverity("success");
    }

    if (totalDeletedCount === 0) {
      setDeleteMessage("ℹ️ Không phát hiện dòng dữ liệu nào để xóa.");
      setDeleteSeverity("info");
    } else {
      setDeleteMessage(`✅ Đã xóa xong dữ liệu (${totalDeletedCount} dòng).`);
      setDeleteSeverity("success");
    }

    setDeleteSuccess(true);
    setDeleteCollections({
      danhsach: false,
      bantru: false,
      diemdan: false,
      nhatkybantru: false,
      xoaHocSinhBanTru: false,
    });
    setShowDeleteOptions(false);
  } catch (err) {
    console.error("❌ Lỗi khi xóa dữ liệu:", err);
    setDeleteMessage("❌ Có lỗi xảy ra khi xóa.");
    setDeleteSeverity("error");
    setDeleteSuccess(false);
  } finally {
    setTimeout(() => {
      setDeleting(false);
      setDeletingLabel("");
      setProgress(0);
      setDeleteSuccess(false);
    }, 1500);
  }
};