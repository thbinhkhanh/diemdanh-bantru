// contexts/ClassDataContext.js
import { createContext, useContext, useState } from "react";

const ClassDataContext = createContext();

export const ClassDataProvider = ({ children }) => {
  const [classDataMap, setClassDataMap] = useState({});

  const setClassData = (classId, data) => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`❌ Không lưu context lớp ${classId} vì dữ liệu rỗng hoặc không hợp lệ`);
      return;
    }

    console.log(`💾 Ghi vào context lớp ${classId}, số lượng học sinh: ${data.length}`);
    setClassDataMap(prev => ({
      ...prev,
      [classId]: data
    }));
  };


  const updateStudentInClass = (classId, updatedStudent) => {
    setClassDataMap(prev => {
      const current = prev[classId] || [];
      const newList = current.map(s =>
        s.id === updatedStudent.id ? updatedStudent : s
      );
      return { ...prev, [classId]: newList };
    });
  };

  const getClassData = (classId) => classDataMap[classId];

  return (
    <ClassDataContext.Provider
      value={{
        classDataMap,
        setClassData,
        getClassData,
        updateClassData: updateStudentInClass // ✅ Sửa tên ở đây
      }}
    >
      {children}
    </ClassDataContext.Provider>
  );
};

export const useClassData = () => useContext(ClassDataContext);
