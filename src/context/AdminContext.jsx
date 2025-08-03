import { createContext, useContext, useState, useEffect } from "react";

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [isManager, setIsManager] = useState(false);

  // ✅ Khi app khởi động: lấy từ localStorage nếu có
  useEffect(() => {
    const savedIsManager = localStorage.getItem("isManager");
    if (savedIsManager !== null) {
      setIsManager(savedIsManager === "true");
    }
  }, []);

  return (
    <AdminContext.Provider value={{ isManager, setIsManager }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
