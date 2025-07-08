// context/ClassListContext.jsx
import { createContext, useContext, useState } from "react";

const ClassListContext = createContext();

export const ClassListProvider = ({ children }) => {
  const [classLists, setClassLists] = useState({}); // ví dụ: { K1: ["1.1", "1.2"], K2: [...] }

  const getClassList = (khoi) => classLists[khoi] || [];

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

export const useClassList = () => useContext(ClassListContext);
