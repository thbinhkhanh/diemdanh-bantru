import React, { createContext, useContext, useState } from "react";

const NhatKyContext = createContext();

export const NhatKyProvider = ({ children }) => {
  const [cache, setCache] = useState({});

  const getKey = (lop, nam, thang) => `${lop}_${nam}_${thang}`;

  const getMonthlyData = (lop, nam, thang) => {
    const key = getKey(lop, nam, thang);
    return cache[key] || [];
  };

  const setMonthlyData = (lop, nam, thang, data) => {
    const key = getKey(lop, nam, thang);
    setCache((prev) => ({ ...prev, [key]: data }));
  };

  const mergeMonthlyData = (lop, nam, thang, newEntries) => {
    const key = getKey(lop, nam, thang);
    setCache((prev) => {
      const existing = prev[key] || [];
      const merged = [...existing, ...newEntries].reduce((acc, entry) => {
        acc[entry.id] = entry;
        return acc;
      }, {});
      return {
        ...prev,
        [key]: Object.values(merged),
      };
    });
  };

  return (
    <NhatKyContext.Provider
      value={{
        getMonthlyData,
        setMonthlyData,
        mergeMonthlyData,
      }}
    >
      {children}
    </NhatKyContext.Provider>
  );
};

export const useNhatKy = () => useContext(NhatKyContext);
