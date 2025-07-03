// src/firebaseActions.js
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";


// Lưu thay đổi đăng ký
export const saveRegistrationChanges = async (students, namHoc) => {
  const tasks = students.map(async (student) => {
    const ref = doc(db, "students", student.id);
    await updateDoc(ref, {
      registered: student.registered,
    });
  });

  await Promise.all(tasks);
};

// Lưu điểm danh nhiều học sinh
export const saveMultipleDiemDanh = async (absentStudents, namHoc, date) => {
  const formattedDate = date.toISOString().split("T")[0];

  const tasks = absentStudents.map(async (student) => {
    const ref = doc(db, "diemdanh", `${namHoc}_${formattedDate}_${student.id}`);
    await setDoc(ref, {
      studentId: student.id,
      name: student.name,
      vangCoPhep: student.vangCoPhep || "",
      lyDo: student.lyDo || "",
      ngay: formattedDate,
      namHoc,
    });
  });

  await Promise.all(tasks);
};
