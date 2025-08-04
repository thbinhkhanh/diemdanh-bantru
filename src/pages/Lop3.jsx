import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Checkbox, FormControl, InputLabel,
  Select, MenuItem, LinearProgress, Typography,
  Radio, FormControlLabel, Stack, TextField, Alert, Card, Button, IconButton
} from '@mui/material';

import { useLocation } from 'react-router-dom';
import { doc, getDoc} from 'firebase/firestore';
import { db } from '../firebase';

//import { enrichStudents } from '../pages/ThanhPhan/enrichStudents';
import { saveRegistrationChanges } from '../pages/ThanhPhan/saveRegistration';
import { saveSingleDiemDanh } from '../pages/ThanhPhan/saveSingleDiemDanh';
import { updateLocalDiemDanh } from '../pages/ThanhPhan/updateLocalDiemDanh';
import { fetchClassList } from '../utils/fetchClassList';
import { fetchStudents } from '../utils/fetchStudents';

//import { MySort } from '../utils/MySort';
import { useNavigate } from 'react-router-dom';

import { useClassData } from '../context/ClassDataContext';
import { useClassList } from '../context/ClassListContext';
import { useNhatKy } from '../context/NhatKyContext';
import { useAdmin } from '../context/AdminContext';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';


export default function DanhSach() {
  const location = useLocation();
  //const useNewVersion = location.state?.useNewVersion ?? false;
  const { isManager } = useAdmin(); // ✅ Lấy từ context

  const [students, setStudents] = useState([]);
  const [originalRegistered, setOriginalRegistered] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [classList, setClassList] = useState([]);
  const [namHoc, setNamHoc] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [viewMode, setViewMode] = useState('bantru');
  const saveTimeout = useRef(null);
  //const filteredStudents = students;
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  //const [saveStatus, setSaveStatus] = useState(null);
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  //const [checkAllDiemDanh, setCheckAllDiemDanh] = useState(true);
  const [checkAllBanTru, setCheckAllBanTru] = useState(true);
  const navigate = useNavigate();
  const [radioValue, setRadioValue] = useState("DiemDanh");
  const { getClassList, setClassListForKhoi } = useClassList();
  
  const [showAbsentList, setShowAbsentList] = useState(false);
  const absentStudents = students.filter(s => !s.diemDanh);
  const hasAbsent = absentStudents.length > 0;
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const lop = location.state?.lop || localStorage.getItem('lop');

  //const { setMonthlyData } = useNhatKy();
  
  const {
    classDataMap: classData,
    getClassData,
    updateClassData,
    setClassData
  } = useClassData();

  const [fetchedClasses, setFetchedClasses] = useState({});

  useEffect(() => {
    if (isManager) {
      fetchClassList({
        namHoc,
        khoi: 'K3',
        getClassList,
        setClassList,
        setClassListForKhoi,
        setSelectedClass,
        location,
        db,
      });
    }
  }, [namHoc, isManager]);

  useEffect(() => {
    fetchStudents({
      db,
      namHoc,
      selectedClass,
      classData,
      fetchedClasses,
      setStudents,
      setClassData,
      setOriginalRegistered,
      setFetchedClasses,
      setIsLoading,
    });
  }, [selectedClass, namHoc, today]);
  
  useEffect(() => {
    setShowAbsentList(false); // Ẩn danh sách vắng khi đổi lớp
  }, [selectedClass]);

  useEffect(() => {
    const lopFromState = location.state?.lop;
    const rememberedAccount = localStorage.getItem("rememberedAccount");

    if (lopFromState) {
      setSelectedClass(lopFromState);
    } else if (/^\d\.\d$/.test(rememberedAccount)) {
      setSelectedClass(rememberedAccount);
    } else {
    
    }
  }, [location.state]);

  useEffect(() => {
    setExpandedRowId(null);
  }, [viewMode]);

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
    const contextData = classData[selectedClass];

    if (Array.isArray(contextData) && contextData.length > 0) {
      setStudents(contextData);

      const initMap = {};
      contextData.forEach(s => (initMap[s.id] = s.registered));
      setOriginalRegistered(initMap);
    } else {
      
    }
  }, [classData, selectedClass]);

  const toggleDiemDanh = async (index) => {
    const targetStudent = students[index];
    const updatedStudent = {
      ...targetStudent,
      diemDanh: !targetStudent.diemDanh,
      registered: !targetStudent.diemDanh,
      lyDo: '',
      vangCoPhep: '',
    };

    // 🎯 Cập nhật vào local context
    updateLocalDiemDanh(updatedStudent, selectedClass, classData, setClassData);

    // 🔄 Hiện chi tiết nếu bỏ điểm danh
    if (!updatedStudent.diemDanh) {
      updatedStudent.registered = false;
      setExpandedRowId(updatedStudent.id);
    } else {
      setExpandedRowId(null);
    }

    // 🖼️ Cập nhật UI (state students)
    setStudents(prev => {
      const copy = [...prev];
      copy[index] = updatedStudent;
      return copy;
    });
    // ☁️ Ghi lên Firestore
    try {
      await saveSingleDiemDanh(updatedStudent, namHoc, selectedClass);
    } catch (err) {
      console.error('❌ toggleDiemDanh error:', err.message);
    }
  };

  const toggleRegister = async (index) => {
    const updatedStudents = [...students];
    updatedStudents[index].registered = !updatedStudents[index].registered;

    setStudents(updatedStudents);

    const changed = [updatedStudents[index]].filter(
      (s) => s.registered !== originalRegistered[s.id]
    );

    //console.log('🟡 Students thay đổi để lưu:', changed);

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
        console.error('❌ Lỗi khi lưu đăng ký bán trú:', err.message);
      }
    } else {
      //console.log('⚠️ Không có thay đổi nào cần lưu');
    }
  };

   const handleClassChange = async (event) => {
    clearTimeout(saveTimeout.current);
    const newClass = event.target.value;
    setSelectedClass(newClass);
  };

  const handleVangCoPhepChange = (index, value) => {
    const updated = [...students];
    updated[index].vangCoPhep = value;
    setStudents(updated);

    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const student = updated[index];

      await saveSingleDiemDanh(
        student,
        namHoc,
        selectedClass
      );
    }, 500); // debounce 0.5s
  };

  const handleLyDoChange = (index, value) => {
    const updated = [...students];
    updated[index].lyDo = value;
    setStudents(updated);

    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const student = updated[index];
      await saveSingleDiemDanh(
        student,
        namHoc,
        selectedClass
      );
    }, 500); // debounce để tránh ghi quá nhiều
  };

  const handleSendZalo = (student) => {
    const msg = `Học sinh: ${student.hoVaTen}\nVắng: ${student.vangCoPhep || '[chưa chọn]'}\nLý do: ${student.lyDo || '[chưa nhập]'}`;
    navigator.clipboard.writeText(msg).then(() => alert('Đã sao chép tin nhắn. Dán vào Zalo để gửi.'));
  };

  useEffect(() => {
    const eligibleStudents = students.filter(s => s.dangKyBanTru === true);
    const allChecked = eligibleStudents.length > 0 && eligibleStudents.every(s => s.registered === true);
    setCheckAllBanTru(allChecked);
  }, [students]);

  const headCellStyle = {
    fontWeight: 'bold',
    backgroundColor: '#1976d2',
    color: 'white',
  };

  const headCellStyleBanTru = {
    ...headCellStyle,
    px: { xs: 0.5, sm: 2 },
    width: { xs: 55, sm: 'auto' },
    whiteSpace: { xs: 'pre-wrap', sm: 'nowrap' },
  };

  const title = isManager 
    ? 'DANH SÁCH HỌC SINH'
    : `DANH SÁCH LỚP ${lop}`;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0, backgroundColor: '#e3f2fd' }}>
      <Card
        sx={{
          mt: 4,
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
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Typography
            variant="h5"
            align="center"
            gutterBottom
            fontWeight="bold"
            color="primary"
            sx={{ mb: 4, borderBottom: '3px solid #1976d2', pb: 1 }}
          >
            {title}
          </Typography>

          {/* Chọn lớp */}
          {isManager && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <FormControl size="small" sx={{ width: 120 }}>
                <InputLabel>Lớp</InputLabel>
                <Select value={selectedClass} label="Lớp" onChange={handleClassChange}>
                  {classList.map(cls => (
                    <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          <IconButton
            onClick={() => navigate('/chon-tai-khoan')}
            sx={{
              position: 'absolute',
              top: '-4px', 
              right: 0,
              color: '#1976d2'
            }}
            aria-label="Chuyển tài khoản"
          >
            <AccountCircleIcon fontSize="medium" />
          </IconButton>
        </Box>

        {/* Chọn chế độ xem */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
          <FormControl component="fieldset">
            <Stack direction="row" spacing={4} alignItems="center">
              <FormControlLabel
                value="diemdanh"
                control={
                  <Radio
                    checked={viewMode === 'diemdanh'}
                    onChange={() => setViewMode('diemdanh')}
                  />
                }
                label="Điểm danh"
              />
              <FormControlLabel
                value="bantru"
                control={
                  <Radio
                    checked={viewMode === 'bantru'}
                    onChange={() => setViewMode('bantru')}
                  />
                }
                label="Bán trú"
              />
            </Stack>
          </FormControl>
        </Box>

        {/* Tóm tắt học sinh vắng */}
          {viewMode !== 'bantru' && (
            <Box sx={{ mb: 2, p: 2, backgroundColor: '#f1f8e9', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
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
                </Box>

                {hasAbsent && (
                  <IconButton onClick={() => setShowAbsentList(prev => !prev)}>
                    {showAbsentList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                )}
              </Stack>

              {hasAbsent && showAbsentList && (
                <Box sx={{ pl: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
                    Danh sách học sinh vắng:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
                    {absentStudents.map((s) => (
                      <li key={s.id}>
                        {s.hoVaTen || 'Không tên'} ({s.vangCoPhep === 'có phép' ? 'P' : 'K'})
                      </li>
                    ))}
                  </Box>
                </Box>
              )}
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
                  <TableCell align="center" sx={headCellStyle}>STT</TableCell>
                  <TableCell align="center" sx={headCellStyle}>HỌ VÀ TÊN</TableCell>

                  {viewMode === 'diemdanh' && (
                    <TableCell align="center" sx={headCellStyle}>ĐIỂM DANH</TableCell>
                  )}

                  {viewMode === 'bantru' && (
                    <TableCell align="center" sx={headCellStyleBanTru}>
                      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                        <Typography sx={{ color: 'white', fontWeight: 'bold' }}>BÁN{"\n"}TRÚ</Typography>
                        <Checkbox
                          checked={checkAllBanTru}
                          onChange={async (e) => {
                            const newVal = e.target.checked;
                            setCheckAllBanTru(newVal);
                            const updated = students.map(s =>
                              (viewMode === 'bantru' ? s.dangKyBanTru : s.showRegisterCheckbox)
                                ? { ...s, registered: newVal }
                                : s
                            );
                            setStudents(updated);

                            const changed = updated.filter(s =>
                              (viewMode === 'bantru' ? s.dangKyBanTru : s.showRegisterCheckbox) &&
                              (originalRegistered[s.id] === undefined || s.registered !== originalRegistered[s.id])
                            );

                            if (changed.length > 0) {
                              try {
                                await saveRegistrationChanges(changed, namHoc, selectedClass, setClassData, classData);
                                const updatedMap = { ...originalRegistered };
                                changed.forEach(s => {
                                  updatedMap[s.id] = s.registered;
                                });
                                setOriginalRegistered(updatedMap);
                                setLastSaved(new Date());
                              } catch (err) {
                                console.error("❌ Lỗi khi lưu đăng ký bán trú:", err.message);
                              }
                            }
                          }}
                          size="small"
                          color="default"
                          sx={{
                            p: 0,
                            color: "white",
                            "& .MuiSvgIcon-root": { fontSize: 18 },
                          }}
                        />
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {(viewMode === 'bantru' ? students.filter(s => s.dangKyBanTru) : students).map((s, index) => (
                  <React.Fragment key={s.id}>
                    <TableRow
                      onMouseEnter={() => setHoveredRowId(s.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        }
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          px: { xs: 1, sm: 2 },
                          width: { xs: 30, sm: 'auto' },
                          backgroundColor: hoveredRowId === s.id ? '#f5f5f5' : 'inherit'
                        }}
                      >
                        {index + 1}
                      </TableCell>

                      <TableCell
                        align="left"
                        sx={{
                          px: { xs: 1, sm: 2 },
                          maxWidth: { xs: 200, sm: 'none' },
                          backgroundColor: hoveredRowId === s.id ? '#f5f5f5' : 'inherit'
                        }}
                      >
                        <Typography
                          sx={{
                            color: '#000000',
                            whiteSpace: 'nowrap',
                            cursor: !s.diemDanh ? 'pointer' : 'default',
                            '&:hover': !s.diemDanh ? { textDecoration: 'underline' } : undefined,
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
                        <TableCell align="center">
                          <Checkbox
                            checked={s.diemDanh}
                            onChange={() => toggleDiemDanh(index)}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                      )}
                      {viewMode === 'bantru' && (
                        <TableCell align="center">
                          <Checkbox
                            checked={s.registered}
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

                    {/* 🔽 Dòng mở rộng hiển thị lý do vắng */}
                    {!s.diemDanh && expandedRowId === s.id && (
                      <TableRow>
                        <TableCell colSpan={viewMode === 'bantru' ? 4 : 3}>
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

        {/* Nút chuyển sang nhật ký */}
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
              backgroundColor: '#1976d2',
              color: '#fff',
              fontSize: '0.9rem',
              px: 3,
              py: 0.6,
              mt: 3,
              mb: 3,
              mx: 'auto',
              display: 'block',
              '&:hover': {
                backgroundColor: '#1565c0'
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