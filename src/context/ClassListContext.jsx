import { createContext, useContext, useState } from "react";

const ClassListContext = createContext();

export const ClassListProvider = ({ children }) => {
  const [classLists, setClassLists] = useState({}); // ví dụ: { K1: [...], TRUONG: [...] }

  // 🔍 Trả về danh sách lớp theo khối
  const getClassList = (khoi) => classLists[khoi] || [];

  // ✏️ Ghi đè hoặc thêm danh sách lớp cho khối
  const setClassListForKhoi = (khoi, list) => {
    setClassLists((prev) => ({
      ...prev,
      [khoi]: list,
    }));
  };

  return (
    <ClassListContext.Provider value={{ classLists, getClassList, setClassListForKhoi }}>
      {children}
    </ClassListContext.Provider>
  );
};

// 🎯 Hook tiện lợi để sử dụng trong component
export const useClassList = () => useContext(ClassListContext);