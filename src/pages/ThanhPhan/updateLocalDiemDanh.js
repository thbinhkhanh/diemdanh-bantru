export const updateLocalDiemDanh = (
  student,
  selectedClass,
  classData,
  setClassData
) => {
  const fullList = classData?.[selectedClass];
  if (!Array.isArray(fullList)) {
    console.warn(`⚠️ classData[${selectedClass}] không phải mảng`);
    return;
  }

  const updatedList = fullList.map(s => {
    if (s.id !== student.id) return s;

    const updated = {
      ...s,
      diemDanh: student.diemDanh,
      registered: student.registered,
      lyDo: student.diemDanh ? '' : (student.lyDo || ''),
      phep: student.diemDanh ? false : (student.vangCoPhep === 'có phép'),
    };

    return updated;
  });

  setClassData(selectedClass, updatedList);
};