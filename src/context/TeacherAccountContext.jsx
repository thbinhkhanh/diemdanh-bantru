import { createContext, useContext, useState, useEffect } from "react";

const TeacherAccountContext = createContext();

export const TeacherAccountProvider = ({ children }) => {
  const [teacherAccounts, setTeacherAccounts] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("teacherAccountsCache");
      if (saved) {
        const cached = JSON.parse(saved);
        setTeacherAccounts((prev) => {
          const merged = { ...prev };
          for (const [khoiKey, accounts] of Object.entries(cached)) {
            if (!merged[khoiKey]) {
              merged[khoiKey] = accounts;
            }
          }
          return merged;
        });
      }
    } catch {}
  }, []);

  const getAccountsByKhoi = (khoi) => teacherAccounts[khoi] || [];

  const setAccountsForKhoi = (khoi, rawList) => {
    const formatted = rawList.map((item) => {
      const isString = typeof item === "string";
      const username = isString ? item : item.username;
      const khoiSo = username.split(".")[0];
      return {
        username,
        hoTen: isString ? "" : item.hoTen || "",
        password: isString ? "1" : item.password || "1",
        khoi: `K${khoiSo}`,
      };
    });

    const updated = { ...teacherAccounts, [khoi]: formatted };
    setTeacherAccounts(updated);

    try {
      localStorage.setItem("teacherAccountsCache", JSON.stringify(updated));
      localStorage.setItem("teacherAccountsCacheTime", Date.now());
    } catch {}
  };

  return (
    <TeacherAccountContext.Provider
      value={{ teacherAccounts, getAccountsByKhoi, setAccountsForKhoi }}
    >
      {children}
    </TeacherAccountContext.Provider>
  );
};

export const useTeacherAccount = () => useContext(TeacherAccountContext);