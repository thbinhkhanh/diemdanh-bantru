import { getDoc, doc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase';

export const fetchStudentsFromFirestore = async (banTruCollection, className, useNewVersion, today) => {
  try {
    if (useNewVersion) {
      // 📄 Mỗi lớp là một document tên theo className (vd: "1.1")
      const classDocRef = doc(db, banTruCollection, className);
      const classSnap = await getDoc(classDocRef);

      if (!classSnap.exists()) return [];

      const data = classSnap.data();
      const rawStudents = data.hocSinh || [];

      return rawStudents.map((hs, idx) => {
        const hasPhepField = hs.hasOwnProperty('phep');
        const isPresent = !hasPhepField;

        let lyDoText = '';
        if (!isPresent) {
          lyDoText = typeof hs.lyDo === 'string' ? hs.lyDo.trim() : '';
        }

        return {
          ...hs,
          stt: idx + 1,
          lop: data.lop || className,
          registered: hs?.diemDanhBanTru === true,
          diemDanh: isPresent,
          vangCoPhep: hasPhepField ? (hs.phep ? 'có phép' : 'không phép') : '',
          lyDo: isPresent ? '' : lyDoText,
        };
      });
    } else {
      // 🧨 Trường hợp cũ: mỗi học sinh là 1 document
      const snapshot = await getDocs(collection(db, banTruCollection));
      return snapshot.docs
        .map(doc => {
          const hs = doc.data();
          const hasPhepField = hs.hasOwnProperty('phep');
          const isPresent = !hasPhepField;

          let lyDoText = '';
          if (!isPresent) {
            lyDoText = typeof hs.lyDo === 'string' ? hs.lyDo.trim() : '';
          }

          return {
            id: doc.id,
            ...hs,
            //registered: hs?.diemDanhBanTru === true,
            registered: hs?.dangKyBanTru === true, // ✅ đúng rồi

            diemDanh: isPresent,
            vangCoPhep: hasPhepField ? (hs.phep ? 'có phép' : 'không phép') : '',
            lyDo: isPresent ? '' : lyDoText,
          };
        })
        .filter(s => s.lop === className);
    }
  } catch (err) {
    console.error('❌ Lỗi khi đọc dữ liệu học sinh:', err.message);
    return [];
  }
};
