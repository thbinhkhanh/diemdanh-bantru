export const enrichStudents = (rawData, today, className, useNewVersion) => {
  return rawData
    .map((d, idx) => {
      const lyDoVang = d?.LyDoVang?.[today] || '';
      const hasPhepField = d.hasOwnProperty('phep');

      // ✅ Xác định học sinh có mặt hay không
      const isPresent = !hasPhepField; // Nếu có field "phep" thì là vắng

      // ✅ Xác định radio "có phép" / "không phép"
      let vangCoPhep = '';
      if (hasPhepField) {
        vangCoPhep = d.phep === true ? 'có phép' : 'không phép';
      }

      return {
        id: d.id,
        ...d,
        stt: idx + 1,
        registered: d?.huyDangKy === 'T',
        showRegisterCheckbox: d?.huyDangKy !== 'x',
        diemDanh: isPresent, // ✅ Checkbox true nếu có mặt
        vangCoPhep,           // ✅ Radio sẽ lấy từ đây
        lyDo: isPresent ? '' : (d.lyDo || lyDoVang),
        lop: d?.lop || '',
      };
    })
    .filter(s => useNewVersion || s.lop === className);
};
