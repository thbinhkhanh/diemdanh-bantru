export const enrichStudents = (rawData, className, useNewVersion) => {
  return rawData
    .map((d, idx) => {
      const hasPhepField = d.hasOwnProperty('phep');
      const isPresent = !hasPhepField;

      let vangCoPhep = '';
      if (hasPhepField) {
        vangCoPhep = d.phep === true ? 'có phép' : 'không phép';
      }

      return {
        ...d,
        id: d.id || `unknown_${idx}`,
        hoVaTen: typeof d.hoTen === 'string' ? d.hoTen.trim() : 'Không rõ tên',
        stt: idx + 1,
        registered: d?.diemDanhBanTru === true,
        diemDanh: isPresent,
        vangCoPhep,
        lyDo: isPresent ? '' : (d.lyDo || '').trim(),
        lop: d?.lop || className,
        maDinhDanh: d?.maDinhDanh || `${className}-${d?.stt || idx + 1}`, // ✅ bổ sung dòng này
      };
    })
    .filter(s => useNewVersion || s.lop === className);
};