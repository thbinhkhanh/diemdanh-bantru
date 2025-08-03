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

    //console.log("📦 Dữ liệu gửi vào setMonthlyData:", data); // ✅ Dùng đúng biến

    setCache((prev) => {
      const existing = prev[key] || [];

      const mergedById = [...existing, ...data].reduce((acc, item) => {
        acc[item.id] = { ...(acc[item.id] || {}), ...item };
        return acc;
      }, {});

      const finalList = Object.values(mergedById);

      //console.log(`[NhatKy] ✅ Ghi đè cache lớp ${lop} tháng ${thang}/${nam}:`);
      finalList.forEach((entry, i) => {
        //console.log(
        //  `  • ${i + 1}. ${entry.hoVaTen || entry.hoTen || "Không tên"} (ID: ${entry.id}) — ${entry.vangCoPhep || "?"} — ${entry.lyDo || "không ghi"}`
        //);
      });

      return {
        ...prev,
        [key]: finalList,
      };
    });
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