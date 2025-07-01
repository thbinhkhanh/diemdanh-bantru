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

export default function Lop1() {
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

  const today = new Date().toISOString().split('T')[0];

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
      try {
        const docRef = doc(db, `DANHSACH_${namHoc}`, 'K1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const list = data.list || [];
          setClassList(list);
          if (list.length > 0) setSelectedClass(list[0]);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách lớp:', err.message);
      }
    };
    fetchClassList();
  }, [namHoc]);

  useEffect(() => {
    const fetchData = async () => {
      if (!namHoc || !selectedClass) return;
      setIsLoading(true);
      try {
        const col = `BANTRU_${namHoc}`;
        const raw = await fetchStudentsFromFirestore(col, selectedClass, useNewVersion);
        const enriched = enrichStudents(raw, today, selectedClass, useNewVersion);
        setStudents(enriched);

        const initMap = {};
        enriched.forEach(s => (initMap[s.id] = s.registered));
        setOriginalRegistered(initMap);
      } catch (err) {
        console.error('Lỗi khi tải học sinh:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [namHoc, selectedClass]);

  const handleSave = async () => {
    if (!namHoc) return;
    setIsSaving(true);

    const changed = students.filter(s => s.registered !== originalRegistered[s.id]);
    const absent = students.filter(s => !s.diemDanh);

    try {
      await saveRegistrationChanges(changed, namHoc);
      await saveMultipleDiemDanh(absent, namHoc, today);

      const updatedMap = { ...originalRegistered };
      changed.forEach(s => (updatedMap[s.id] = s.registered));
      setOriginalRegistered(updatedMap);

      setLastSaved(new Date()); // 👈 THÊM DÒNG NÀY
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
    }
    setStudents(updated);
    await saveSingleDiemDanh(updated[index], namHoc);
  };

  const toggleRegister = (index) => {
    const updated = [...students];
    updated[index].registered = !updated[index].registered;
    setStudents(updated);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(handleSave, 2000);
  };

  const handleClassChange = async (event) => {
    clearTimeout(saveTimeout.current);
    await handleSave();
    setSelectedClass(event.target.value);
  };

  const handleVangCoPhepChange = (index, value) => {
    const updated = [...students];
    updated[index].vangCoPhep = value;
    setStudents(updated);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveSingleDiemDanh(updated[index], namHoc);
    }, 1000);
  };

  const handleLyDoChange = (index, value) => {
    const updated = [...students];
    updated[index].lyDo = value;
    setStudents(updated);
  };

  const handleSendZalo = (student) => {
    const msg = `Học sinh: ${student.hoVaTen}\nVắng: ${student.vangCoPhep || '[chưa chọn]'}\nLý do: ${student.lyDo || '[chưa nhập]'}`;
    navigator.clipboard.writeText(msg).then(() => alert('Đã sao chép tin nhắn. Dán vào Zalo để gửi.'));
  };

  return (
  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 12 }}>
    <Card
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: 450,
        width: '100%',
        borderRadius: 4,
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        backgroundColor: 'white'
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

      {/* Tóm tắt học sinh - chỉ hiện nếu không phải "bán trú" */}
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
                  <li key={i}>
                    {s.hoVaTen || 'Không tên'} ({s.vangCoPhep === 'có phép' ? 'P' : 'K'})
                  </li>
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
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1976d2', height: 48 }}>
                <TableCell align="center" sx={{ color: 'white' }}><strong>STT</strong></TableCell>
                <TableCell align="left" sx={{ color: 'white' }}><strong>HỌ VÀ TÊN</strong></TableCell>
                {viewMode === 'diemdanh' && (
                  <TableCell align="center" sx={{ color: 'white' }}><strong>ĐIỂM DANH</strong></TableCell>
                )}
                {viewMode === 'bantru' && (
                  <TableCell align="center" sx={{ color: 'white' }}><strong>BÁN TRÚ</strong></TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((s, index) => (
                <React.Fragment key={s.id}>
                  <TableRow hover sx={{ height: 48 }}>
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell align="left">
                      <Typography
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => setExpandedRowId(prev => prev === s.id ? null : s.id)}
                      >
                        {s.hoVaTen || 'Không có tên'}
                      </Typography>
                    </TableCell>

                    {viewMode === 'diemdanh' && (
                      <TableCell align="center">
                        <Checkbox checked={s.diemDanh} onChange={() => toggleDiemDanh(index)} />
                      </TableCell>
                    )}

                    {viewMode === 'bantru' && (
                      <TableCell align="center">
                        {s.showRegisterCheckbox && (
                          <Checkbox checked={s.registered} onChange={() => toggleRegister(index)} />
                        )}
                      </TableCell>
                    )}
                  </TableRow>

                  {!s.diemDanh && viewMode === 'diemdanh' && expandedRowId === s.id && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ backgroundColor: '#f9f9f9' }}>
                        <Stack spacing={1} sx={{ pl: 2, py: 1 }}>
                          <Stack direction="row" spacing={4}>
                            <FormControlLabel
                              control={
                                <Radio
                                  checked={s.vangCoPhep === 'có phép'}
                                  onChange={() => handleVangCoPhepChange(index, 'có phép')}
                                  value="có phép"
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
                              onClick={() => handleSendZalo(s)}
                              size="small"
                              sx={{
                                px: 2.5,
                                height: '40px',
                                backgroundColor: '#e3f2fd',
                                '&:hover': { backgroundColor: '#bbdefb' },
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

      {/* Thông báo lưu */}
      <Box sx={{ mt: 2 }}>
        {isSaving && (
          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
            Đang lưu...
          </Alert>
        )}
        {lastSaved && !isSaving && (
          <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
            Đã lưu lúc {lastSaved.toLocaleTimeString('vi-VN')}
          </Alert>
        )}
      </Box>
    </Card>
  </Box>
);


}