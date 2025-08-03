// contexts/ClassDataContext.js
import { createContext, useContext, useState } from "react";

const ClassDataContext = createContext();

export const ClassDataProvider = ({ children }) => {
  const [classDataMap, setClassDataMap] = useState({});

  // 🆕 Ghi toàn bộ dữ liệu lớp (mảng học sinh)
  const setClassData = (classId, hocSinhList) => {
    if (!Array.isArray(hocSinhList)) {
      console.warn(`❌ Không lưu lớp ${classId} vì dữ liệu không phải mảng`);
      return;
    }

    setClassDataMap(prev => ({
      ...prev,
      [classId]: hocSinhList
    }));
  };

  // 🆕 Cập nhật 1 học sinh trong lớp theo cấu trúc mới
  const updateStudentInClass = (classId, updatedStudent) => {
    setClassDataMap(prev => {
      const currentList = prev[classId] || [];

      // Tìm và cập nhật học sinh theo ID
      const newList = currentList.map(s =>
        s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s
      );

      return {
        ...prev,
        [classId]: newList
      };
    });
  };

  // 🆕 Hàm lấy toàn bộ danh sách học sinh của lớp
  const getClassData = (classId) => classDataMap[classId] || [];

  return (
    <ClassDataContext.Provider
      value={{
        classDataMap,
        setClassData,
        getClassData,
        updateClassData: updateStudentInClass
      }}
    >
      {children}
    </ClassDataContext.Provider>
  );
};

export const useClassData = () => useContext(ClassDataContext);