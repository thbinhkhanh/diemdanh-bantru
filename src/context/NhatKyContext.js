// context/NhatKyContext.js
import React, { createContext, useContext, useState } from "react";

const NhatKyContext = createContext();

export const NhatKyProvider = ({ children }) => {
  const [monthlyDataCache, setMonthlyDataCache] = useState({});

  const getMonthlyData = (lop, year, month) => {
    const key = `${lop}_${year}_${month}`;
    return monthlyDataCache[key];
  };

  const setMonthlyData = (lop, year, month, data) => {
    const key = `${lop}_${year}_${month}`;
    setMonthlyDataCache(prev => ({ ...prev, [key]: data }));
  };

  return (
    <NhatKyContext.Provider value={{ getMonthlyData, setMonthlyData }}>
      {children}
    </NhatKyContext.Provider>
  );
};

export const useNhatKy = () => {
  const context = useContext(NhatKyContext);
  if (!context) {
    console.warn("useNhatKy must be used inside a NhatKyProvider");
  }
  return context;
};
