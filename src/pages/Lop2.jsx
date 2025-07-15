import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Checkbox, FormControl, InputLabel,
  Select, MenuItem, LinearProgress, Typography,
  Radio, FormControlLabel, Stack, TextField, Alert, Card, Button
} from '@mui/material';

import { useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

import { fetchStudentsFromFirestore } from '../pages/ThanhPhan/fetchStudents';
import { enrichStudents } from '../pages/ThanhPhan/enrichStudents';
import { saveRegistrationChanges } from '../pages/ThanhPhan/saveRegistration';
import { saveMultipleDiemDanh } from '../pages/ThanhPhan/saveDiemDanh';
import { saveSingleDiemDanh } from '../pages/ThanhPhan/saveSingleDiemDanh';

import { MySort } from '../utils/MySort';
import { useNavigate } from 'react-router-dom';
import NhatKyDiemDanhGV from '../NhatKyDiemDanhGV';

import { useClassData } from '../context/ClassDataContext';
import { useClassList } from '../context/ClassListContext';

export default function Lop2() {
  const location = useLocation();
  const useNewVersion = location.state?.useNewVersion ?? false;

  const [students, setStudents] = useState([]);
  const [originalRegistered, setOriginalRegistered] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [classList, setClassList] = useState([]);
  const [namHoc, setNamHoc] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [viewMode, setViewMode] = useState('bantru');
  const saveTimeout = useRef(null);
  const filteredStudents = students;
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const [checkAllDiemDanh, setCheckAllDiemDanh] = useState(true);
  const [checkAllBanTru, setCheckAllBanTru] = useState(true);
  const navigate = useNavigate();
  const [radioValue, setRadioValue] = useState("DiemDanh");
  const { getClassList, setClassListForKhoi } = useClassList();

  const {
    classDataMap: classData,
    getClassData,
    updateClassData,
    setClassData
  } = useClassData();

  const [fetchedClasses, setFetchedClasses] = useState({});

  useEffect(() => {
    const lopFromState = location.state?.lop;
    if (lopFromState) {
      setSelectedClass(lopFromState); // ⬅️ cập nhật lớp dựa trên state khi quay lại
    }
  }, [location.state, setSelectedClass]);

  useEffect(() => {
    setExpandedRowId(null);
  }, [viewMode]);

  useEffect(() => {
    const allRegistered = students.length > 0 &&
      students.every(s => !s.showRegisterCheckbox || s.registered);
    setCheckAllBanTru(allRegistered); // cập nhật trạng thái checkbox theo dữ liệu mới
  }, [students]);

  useEffect(() => {
    if (lastSaved && !isSaving) {
      // So sánh nếu thời gian mới khác với trước đó
      const newTime = lastSaved.getTime();
      if (newTime !== lastSavedTime) {
        setLastSavedTime(newTime);
        setShowSavedAlert(true);

        const timer = setTimeout(() => {
          setShowSavedAlert(false);
        }, 2000); // 5 giây

        return () => clearTimeout(timer);
      }
    }
  }, [lastSaved, isSaving]);

  useEffect(() => {
    const fetchNamHoc = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'YEAR', 'NAMHOC'));
        if (docSnap.exists()) {
          setNamHoc(docSnap.data().value || 'UNKNOWN');
        }
      } catch (err) {
        console.error('Lỗi khi tải năm học:', err.message);
        setNamHoc('UNKNOWN');
      }
    };
    fetchNamHoc();
  }, []);

  
  useEffect(() => {
    const fetchClassList = async () => {
      if (!namHoc) return;

      const khoi = 'K2';
      const cachedList = getClassList(khoi);

      if (cachedList.length > 0) {
        setClassList(cachedList);
        const lopFromState = location.state?.lop;
        if (lopFromState && cachedList.includes(lopFromState)) {
          setSelectedClass(lopFromState);
        } else {
          setSelectedClass(cachedList[0]);
        }
        return;
      }

      try {
        const docRef = doc(db, `CLASSLIST_${namHoc}`, khoi);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const list = data.list || [];

          setClassList(list);
          setClassListForKhoi(khoi, list); // ✅ Lưu vào context

          const lopFromState = location.state?.lop;
          if (lopFromState && list.includes(lopFromState)) {
            setSelectedClass(lopFromState);
          } else if (list.length > 0) {
            setSelectedClass(list[0]);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách lớp:', err.message);
      }
    };

    fetchClassList();
  }, [namHoc]);



  useEffect(() => {
    const contextData = classData[selectedClass];

    if (Array.isArray(contextData) && contextData.length > 0) {
      //console.log(`✅ Dùng lại dữ liệu lớp ${selectedClass} từ context`);
      setStudents(contextData);

      const initMap = {};
      contextData.forEach(s => (initMap[s.id] = s.registered));
      setOriginalRegistered(initMap);
    } else {
      //console.log(`ℹ️ Không có dữ liệu lớp ${selectedClass} trong context`);
    }
  }, [classData, selectedClass]);

  useEffect(() => {
    const contextData = classData[selectedClass];
    const alreadyFetched = fetchedClasses[selectedClass];
    const shouldFetch = !Array.isArray(contextData) || contextData.length === 0;

    if (!shouldFetch || alreadyFetched || !namHoc || !selectedClass) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        //console.log(`🟡 Fetch Firestore lớp ${selectedClass}`);
        const col = `DANHSACH_${namHoc}`;
        const raw = await fetchStudentsFromFirestore(col, selectedClass, useNewVersion);
        const enriched = enrichStudents(raw, today, selectedClass, useNewVersion);
        const sorted = MySort(enriched);

        setStudents(sorted);
        setClassData(selectedClass, sorted);

        const initMap = {};
        sorted.forEach(s => (initMap[s.id] = s.registered));
        setOriginalRegistered(initMap);

        setFetchedClasses(prev => ({ ...prev, [selectedClass]: true })); // ✅ Đánh dấu đã fetch
      } catch (err) {
        console.error("🔥 Lỗi fetch học sinh:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedClass, namHoc, today, useNewVersion]);

  const handleSave = async () => {
    if (!namHoc) return;
    setIsSaving(true);
    const changed = students.filter(s => s.registered !== originalRegistered[s.id]);
    const absent = students.filter(s => !s.diemDanh);
    // 👉 Không có gì thay đổi thì thoát sớm
    if (changed.length === 0 && absent.length === 0) {
      setIsSaving(false); // Đảm bảo không kẹt ở trạng thái "Đang lưu..."
      return;
    }
    try {
      //await saveRegistrationChanges(changed, namHoc);
      await saveRegistrationChanges(changed, namHoc, selectedClass, setClassData, classData);
      //await saveMultipleDiemDanh(absent, namHoc, today);
      await saveMultipleDiemDanh(absent, namHoc, today, selectedClass, classData, setClassData);
      const updatedMap = { ...originalRegistered };
      changed.forEach(s => (updatedMap[s.id] = s.registered));
      setOriginalRegistered(updatedMap);
      setLastSaved(new Date()); // ✅ Gọi chính xác khi thực sự có lưu
    } catch (err) {
      console.error('Lỗi khi lưu:', err.message);
    } finally {
      setIsSaving(false);
    }
  };


  const toggleDiemDanh = async (index) => {
    const updated = [...students];
    updated[index].diemDanh = !updated[index].diemDanh;

    if (updated[index].diemDanh) {
      updated[index].vangCoPhep = '';
      updated[index].lyDo = '';
      setExpandedRowId(null);
    } else {
      updated[index].registered = false;
      setExpandedRowId(updated[index].id);

      // ✅ GỌI LƯU BÁN TRÚ NGAY LÚC ĐÓ
      //await saveRegistrationChanges([updated[index]], namHoc);
      await saveRegistrationChanges(
        [updated[index]],
        namHoc,
        selectedClass,
        setClassData,
        classData // 💡 rất quan trọng để tránh mất dòng khác
      );

      // ✅ CẬP NHẬT BẢN SAO CỦA originalRegistered CHỈ VỚI HỌC SINH ĐÓ
      setOriginalRegistered(prev => ({
        ...prev,
        [updated[index].id]: false,
      }));
    }

    setStudents(updated);

    // ✅ Điểm danh luôn lưu như cũ
    //await saveSingleDiemDanh(updated[index], namHoc);
    await saveSingleDiemDanh(updated[index], namHoc, selectedClass, classData, setClassData);
  };

  const toggleRegister = async (index) => {
    const updatedStudents = [...students];
    updatedStudents[index].registered = !updatedStudents[index].registered;

    setStudents(updatedStudents);

    const changed = [updatedStudents[index]].filter(
      (s) => s.showRegisterCheckbox && s.registered !== originalRegistered[s.id]
    );

    if (changed.length > 0) {
      try {
        await saveRegistrationChanges(changed, namHoc, selectedClass, setClassData, classData);
        const updatedMap = { ...originalRegistered };
        changed.forEach((s) => {
          updatedMap[s.id] = s.registered;
        });
        setOriginalRegistered(updatedMap);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Lỗi khi lưu đăng ký bán trú:', err.message);
      }
    }
  };

   const handleClassChange = async (event) => {
    clearTimeout(saveTimeout.current);
    const newClass = event.target.value;
    setSelectedClass(newClass);
    // Đợi cập nhật lớp xong rồi mới lưu
    //setTimeout(() => {
      //handleSave(); // handleSave đã có kiểm tra thay đổi, nên an toàn
    //}, 0);
  };


  const handleVangCoPhepChange = (index, value) => {
    const updated = [...students];
    updated[index].vangCoPhep = value;
    setStudents(updated);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      //saveSingleDiemDanh(updated[index], namHoc);
      saveSingleDiemDanh(updated[index], namHoc, selectedClass, classData, setClassData);
    }, 1000);
  };

  const handleLyDoChange = (index, value) => {
    const updated = [...students];
    updated[index].lyDo = value;
    setStudents(updated);

    // Gọi lưu sau khi cập nhật lý do
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      //saveSingleDiemDanh(updated[index], namHoc);
      saveSingleDiemDanh(updated[index], namHoc, selectedClass, classData, setClassData);
    }, 500); // debounce tránh lưu quá nhanh khi người dùng đang gõ
  };

  const handleSendZalo = (student) => {
    const msg = `Học sinh: ${student.hoVaTen}\nVắng: ${student.vangCoPhep || '[chưa chọn]'}\nLý do: ${student.lyDo || '[chưa nhập]'}`;
    navigator.clipboard.writeText(msg).then(() => alert('Đã sao chép tin nhắn. Dán vào Zalo để gửi.'));
  };

  return (
  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, backgroundColor: '#e3f2fd' }}>
    <Card
      sx={{
        mt:4,
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: 470,
        width: '100%',
        borderRadius: 4,
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        backgroundColor: 'white',
        minHeight: '100vh'
      }}
      elevation={10}
    >
      <Typography
        variant="h5"
        align="center"
        gutterBottom
        fontWeight="bold"
        color="primary"
        sx={{ mb: 4, borderBottom: '3px solid #1976d2', pb: 1 }}
      >
        DANH SÁCH HỌC SINH
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <FormControl size="small" sx={{ width: 120 }}>
          <InputLabel>Lớp</InputLabel>
          <Select value={selectedClass} label="Lớp" onChange={handleClassChange}>
            {classList.map(cls => (
              <MenuItem key={cls} value={cls}>{cls}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 1, mb: 2 }}>
        <FormControlLabel
          value="diemdanh"
          control={<Radio checked={viewMode === 'diemdanh'} onChange={() => setViewMode('diemdanh')} />}
          label="Điểm danh"
        />
        <FormControlLabel
          value="bantru"
          control={<Radio checked={viewMode === 'bantru'} onChange={() => setViewMode('bantru')} />}
          label="Bán trú"
        />
      </Stack>

      {/* Tóm tắt học sinh vắng */}
      {viewMode !== 'bantru' && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: '#f1f8e9', borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Thông tin tóm tắt
          </Typography>
          <Stack direction="row" spacing={4} sx={{ pl: 2 }}>
            <Typography variant="body2">
              Sĩ số: <strong>{students.length}</strong>
            </Typography>
            <Typography variant="body2">
              Vắng: Phép: <strong>{students.filter(s => !s.diemDanh && s.vangCoPhep === 'có phép').length}</strong>
              &nbsp;&nbsp;
              Không: <strong>{students.filter(s => !s.diemDanh && s.vangCoPhep === 'không phép').length}</strong>
            </Typography>
          </Stack>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
            Danh sách học sinh vắng:
          </Typography>
          <Box sx={{ pl: 2 }}>
            {students.filter(s => !s.diemDanh).length === 0 ? (
              <Typography variant="body2">Không có học sinh vắng.</Typography>
            ) : (
              <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
                {students.filter(s => !s.diemDanh).map((s, i) => (
                  <li key={s.id}>{s.hoVaTen || 'Không tên'} ({s.vangCoPhep === 'có phép' ? 'P' : 'K'})</li>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <LinearProgress sx={{ width: '50%' }} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 1, mt: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    px: { xs: 1, sm: 2 },
                    width: { xs: 30, sm: 'auto' },
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: '#1976d2',
                    color: 'white',
                  }}
                >
                  HỌ VÀ TÊN
                </TableCell>

                {viewMode === 'diemdanh' && (
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      px: { xs: 1, sm: 2 },
                      width: { xs: 55, sm: 'auto' },
                    }}
                  >
                    ĐIỂM{"\n"}DANH
                  </TableCell>
                )}

                {viewMode === 'bantru' && (
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      px: { xs: 0.5, sm: 2 },
                      width: { xs: 55, sm: 'auto' },
                      whiteSpace: { xs: 'pre-wrap', sm: 'nowrap' },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                      <Typography sx={{ color: 'white', fontWeight: 'bold' }}>BÁN{"\n"}TRÚ</Typography>
                      <Checkbox
                        checked={checkAllBanTru}
                        onChange={async (e) => {
                          const newVal = e.target.checked;
                          setCheckAllBanTru(newVal);

                          // 🔄 Cập nhật danh sách học sinh
                          const updated = students.map((s) =>
                            s.showRegisterCheckbox ? { ...s, registered: newVal } : s
                          );
                          setStudents(updated);

                          // 🔍 Lọc những học sinh có registered thay đổi so với original
                          const changed = updated.filter(
                            (s) => s.showRegisterCheckbox && s.registered !== originalRegistered[s.id]
                          );

                          // 💾 Gọi lưu nếu có thay đổi
                          if (changed.length > 0) {
                            try {
                              //await saveRegistrationChanges(changed, namHoc);
                              await saveRegistrationChanges(changed, namHoc, selectedClass, setClassData, classData);

                              // Cập nhật lại originalRegistered
                              const updatedMap = { ...originalRegistered };
                              changed.forEach((s) => {
                                updatedMap[s.id] = s.registered;
                              });
                              setOriginalRegistered(updatedMap);
                              setLastSaved(new Date());
                            } catch (err) {
                              console.error('Lỗi khi lưu đăng ký bán trú:', err.message);
                            }
                          }
                        }}
                        size="small"
                        color="default"
                        sx={{
                          p: 0,
                          color: 'white',
                          '& .MuiSvgIcon-root': { fontSize: 18 },
                        }}
                      />
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

              <TableBody>
                {(viewMode === 'bantru'
                  ? students.filter(s => s.huyDangKy !== "x")
                  : students
                ).map((s, index) => (
                  <React.Fragment key={s.id}>
                    <TableRow>
                      <TableCell
                        align="center"
                        sx={{ px: { xs: 1, sm: 2 }, width: { xs: 30, sm: 'auto' } }}
                      >
                        {index + 1}
                      </TableCell>

                      <TableCell
                        align="left"
                        sx={{
                          px: { xs: 1, sm: 2 },
                          width: { xs: 200, sm: 'auto' },
                          maxWidth: { xs: 200, sm: 'none' },
                        }}
                      >
                        <Typography
                          sx={{
                            cursor: !s.diemDanh ? 'pointer' : 'default',
                            color: '#000000',
                            '&:hover': !s.diemDanh ? { textDecoration: 'underline' } : undefined,
                            whiteSpace: 'nowrap',
                            overflowX: 'auto',
                            WebkitOverflowScrolling: 'touch',
                          }}
                          onClick={() => {
                            if (!s.diemDanh) {
                              setExpandedRowId(prev => (prev === s.id ? null : s.id));
                            }
                          }}
                        >
                          {s.hoVaTen || 'Không có tên'}
                        </Typography>
                      </TableCell>

                      {viewMode === 'diemdanh' && (
                        <TableCell
                          align="center"
                          sx={{ px: { xs: 1, sm: 2 }, width: { xs: 40, sm: 'auto' } }}
                        >
                          <Checkbox
                            checked={s.diemDanh}
                            onChange={() => toggleDiemDanh(index)}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                      )}

                      {viewMode === 'bantru' && (
                        <TableCell align="center" sx={{ px: { xs: 1, sm: 2 }, width: { xs: 50, sm: 'auto' } }}>
                          <Checkbox
                            //checked={s.huyDangKy === "T"}
                            checked={s.registered}
                            //onChange={() => toggleRegister(index)}
                            onChange={() => {
                              const trueIndex = students.findIndex(x => x.id === s.id);
                              toggleRegister(trueIndex);
                            }}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                      )}
                    </TableRow>

                    {!s.diemDanh && expandedRowId === s.id && (
                      <TableRow>
                        <TableCell
                          colSpan={viewMode === 'bantru' ? 4 : 3}
                          sx={{ backgroundColor: '#f9f9f9' }}
                        >
                          {/* Chi tiết vắng */}
                          <Stack spacing={1} sx={{ pl: 2, py: 1 }}>
                            <Stack direction="row" spacing={4}>
                              <FormControlLabel
                                control={
                                  <Radio
                                    checked={s.vangCoPhep === 'có phép'}
                                    onChange={() => handleVangCoPhepChange(index, 'có phép')}
                                    value="có phép"
                                    color="primary"
                                    size="small"
                                  />
                                }
                                label="Có phép"
                              />
                              <FormControlLabel
                                control={
                                  <Radio
                                    checked={s.vangCoPhep === 'không phép'}
                                    onChange={() => handleVangCoPhepChange(index, 'không phép')}
                                    value="không phép"
                                    color="primary"
                                    size="small"
                                  />
                                }
                                label="Không phép"
                              />
                            </Stack>

                            <Stack direction="row" spacing={2} alignItems="center">
                              <TextField
                                label="Lý do"
                                value={s.lyDo || ''}
                                onChange={(e) => handleLyDoChange(index, e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                              />
                              <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => handleSendZalo(s)}
                                size="small"
                                sx={{
                                  whiteSpace: 'nowrap',
                                  px: 2.5,
                                  height: '40px',
                                  backgroundColor: '#e3f2fd',
                                  '&:hover': {
                                    backgroundColor: '#bbdefb',
                                  },
                                }}
                              >
                                Xuất Zalo
                              </Button>
                            </Stack>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

        )}

        {viewMode !== "bantru" && (
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              if (!selectedClass) {
                alert('Vui lòng chọn lớp trước khi vào nhật ký!');
                return;
              }

              navigate('/nhatky', { state: { lop: selectedClass } });
            }}
            sx={{
              textTransform: 'none',
              backgroundColor: '#1976d2', // Màu xanh (có thể dùng theme palette nếu thích)
              color: '#fff',              // Chữ trắng
              fontSize: '0.9rem',         // Cỡ chữ lớn hơn
              px: 3,                      // Padding ngang lớn hơn
              py: 0.6,                    // Padding dọc
              mt: 3,
              mb: 3,
              mx: 'auto',                 // Căn giữa theo chiều ngang
              display: 'block',           // Phải dùng display: block để mx: auto hoạt động
              '&:hover': {
                backgroundColor: '#1565c0' // Màu xanh đậm hơn khi hover
              }
            }}
          >
            Nhật ký điểm danh
          </Button>
        )}

        {/* Thông báo lưu */}
        <Box sx={{ mt: 2 }}>
          {isSaving && (
            <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
              Đang lưu...
            </Alert>
          )}
          {lastSaved && !isSaving && showSavedAlert && (
            <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
              Đã lưu lúc {lastSaved.toLocaleTimeString('vi-VN')}
            </Alert>
          )}
        </Box>
      </Card>
    </Box>
  );
}