import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Stack, MenuItem,
  Select, FormControl, InputLabel, Checkbox, Card, LinearProgress,
  Alert
} from '@mui/material';
import { getDocs, getDoc, collection, doc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { MySort } from './utils/MySort';
import { useClassList } from './context/ClassListContext';
import { useClassData } from './context/ClassDataContext';
import { query, where } from "firebase/firestore";
import { enrichStudents } from "./pages/ThanhPhan/enrichStudents";

export default function LapDanhSach({ onBack }) {
  const { getClassList, setClassListForKhoi } = useClassList();
  const { getClassData, setClassData } = useClassData();

  const [allStudents, setAllStudents] = useState([]); // lưu học sinh của lớp đang chọn
  const [selectedClass, setSelectedClass] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classList, setClassList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [namHocValue, setNamHocValue] = useState(null);

  const getNgayVN = () => {
    const now = new Date(); // không cộng thêm vì đã dùng GMT+7
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  // Lần đầu tải danh sách lớp và năm học
  useEffect(() => {
    const fetchClassListAndYear = async () => {
      setIsLoading(true);
      try {
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHoc = namHocDoc.exists() ? namHocDoc.data().value : null;
        setNamHocValue(namHoc);

        if (!namHoc) {
          setAlertInfo({
            open: true,
            message: "❌ Không tìm thấy năm học hợp lệ trong hệ thống!",
            severity: "error",
          });
          setIsLoading(false);
          return;
        }

        let cachedClassList = getClassList("TRUONG");
        if (!cachedClassList || cachedClassList.length === 0) {
          const classDoc = await getDoc(doc(db, `CLASSLIST_${namHoc}`, "TRUONG"));
          cachedClassList = classDoc.exists() ? classDoc.data().list || [] : [];
          if (cachedClassList.length > 0) {
            setClassListForKhoi("TRUONG", cachedClassList);
          } else {
            console.warn(`⚠️ Không tìm thấy CLASSLIST_${namHoc}/TRUONG`);
          }
        }
        setClassList(cachedClassList);
        const initialClass = cachedClassList[0] || '';
        setSelectedClass(initialClass);
      } catch (err) {
        console.error('❌ Lỗi khi tải dữ liệu năm học hoặc danh sách lớp:', err);
        setAlertInfo({
          open: true,
          message: '❌ Lỗi khi tải dữ liệu năm học hoặc danh sách lớp.',
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassListAndYear();
  }, [getClassList, setClassListForKhoi]);

  // Khi lớp được chọn thay đổi, tải dữ liệu học sinh cho lớp đó nếu chưa có
  useEffect(() => {
    if (!selectedClass || !namHocValue) return;

    const fetchStudentsForClass = async () => {
      setIsLoading(true);
      try {
        const cached = getClassData(selectedClass);
        if (cached && cached.length > 0) {
          const sortedCached = MySort(cached); // 👉 thêm dòng này để sắp xếp
          const transformedCached = sortedCached.map((s, index) => {
            const isRegistered = s.dangKyBanTru === true;
            return {
              ...s,
              stt: index + 1,
              registered: isRegistered,
              originalRegistered: isRegistered,
            };
          });

          setFilteredStudents(transformedCached);
          setAllStudents(transformedCached);
          return;
        }

        const snapshot = await getDocs(collection(db, `DANHSACH_${namHocValue}`));
        const rawStudents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const studentsOfClass = rawStudents.filter(s => s.lop === selectedClass);
        const enriched = enrichStudents(studentsOfClass, null, selectedClass, true);

        const enrichedStudents = MySort(enriched).map((s, index) => {
          const isRegistered = s.dangKyBanTru === true;
          return {
            ...s,
            stt: index + 1,
            registered: isRegistered,
            originalRegistered: isRegistered,
          };
        });


        setClassData(selectedClass, enrichedStudents);
        setFilteredStudents(enrichedStudents);
        setAllStudents(enrichedStudents);
      } catch (err) {
        console.error('❌ Lỗi khi fetch học sinh:', err);
        setAlertInfo({
          open: true,
          message: '❌ Không thể tải dữ liệu học sinh.',
          severity: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsForClass();
  }, [selectedClass, namHocValue, getClassData, setClassData]);


const handleClassChange = (event) => {
    const selected = event.target.value;
    setSelectedClass(selected);
    setAlertInfo({ open: false, message: '', severity: 'success' });
  };

  const toggleRegister = (index) => {
    const updated = [...filteredStudents];
    updated[index].registered = !updated[index].registered;

    setFilteredStudents(updated);

    setAllStudents(prev =>
      prev.map(student =>
        student.id === updated[index].id
          ? { ...student, registered: updated[index].registered }
          : student
      )
    );

    setAlertInfo({ open: false, message: '', severity: 'success' });
  };

  const handleSave = async () => {
    const loginRole = localStorage.getItem("loginRole");

    if (loginRole !== "admin" && loginRole !== "bgh") {
      setAlertInfo({
        open: true,
        message: '❌ Bạn không có quyền lập danh sách bán trú!',
        severity: 'error',
      });
      return;
    }

    setIsSaving(true);
    setAlertInfo({ open: false, message: '', severity: 'success' });

    try {
      const changedStudents = filteredStudents.filter(
        s => s.registered !== s.originalRegistered
      );

      if (!namHocValue) throw new Error("Không có năm học hợp lệ");

      if (changedStudents.length === 0) {
        setAlertInfo({
          open: true,
          message: '✅ Không có thay đổi nào để lưu.',
          severity: 'success'
        });
        return;
      }

      for (let student of changedStudents) {
        await updateDoc(doc(db, `DANHSACH_${namHocValue}`, student.id), {
          dangKyBanTru: student.registered,
          diemDanhBanTru: student.registered,
        });

          // Ghi nhật ký bán trú KHÔNG ghi đè và có thời gian chi tiết
          const timestamp = Date.now();
          const logId = `${student.lop}-${student.id.slice(-7)}-${timestamp}`;
          const logRef = doc(db, `NHATKYBANTRU_${namHocValue}`, logId);

          await setDoc(logRef, {
            maDinhDanh: `${student.lop}-${student.id.slice(-7)}`,
            hoVaTen: student.hoVaTen || "",
            lop: student.lop || selectedClass,
            trangThai: student.registered ? "Đăng ký" : "Hủy đăng ký",
            ngayDieuChinh: getNgayVN(), // 👇 Định nghĩa lại bên dưới
          });
      }

      // Cập nhật lại local state và context
      const updatedAllStudents = allStudents.map(student => {
        const changed = changedStudents.find(s => s.id === student.id);
        if (changed) {
          return {
            ...student,
            registered: changed.registered,
            originalRegistered: changed.registered,
            dangKyBanTru: changed.registered,
            diemDanhBanTru: changed.registered,
          };
        }
        return student;
      });

      setAllStudents(updatedAllStudents);
      setFilteredStudents(updatedAllStudents);
      setClassData(selectedClass, updatedAllStudents);

      setAlertInfo({
        open: true,
        message: '✅ Lưu thành công!',
        severity: 'success'
      });
    } catch (err) {
      console.error('❌ Lỗi khi lưu dữ liệu:', err);
      setAlertInfo({
        open: true,
        message: '❌ Không thể lưu dữ liệu.',
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
      <Card
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: 450,
          width: { xs: '98%', sm: '100%' },
          borderRadius: 4,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          backgroundColor: 'white',
        }}
        elevation={10}
      >
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h5"
            align="center"
            fontWeight="bold"
            color="primary"
          >
            LẬP DANH SÁCH BÁN TRÚ
          </Typography>
          <Box
            sx={{
              height: 2.5,
              width: '100%',
              backgroundColor: '#1976d2',
              borderRadius: 1,
              mt: 2,
              mb: 4
            }}
          />
        </Box>

        <Stack direction="row" justifyContent="center" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Lớp</InputLabel>
            <Select value={selectedClass || ''} label="Lớp" onChange={handleClassChange}>
              {classList.map((cls, idx) => (
                <MenuItem key={idx} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
            <Box sx={{ width: '50%' }}><LinearProgress /></Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Đang tải dữ liệu học sinh...
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, mt: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{
                    fontWeight: 'bold',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    px: { xs: 0.5, sm: 1, md: 2 }
                  }}>STT</TableCell>
                  <TableCell align="center" sx={{
                    fontWeight: 'bold',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    px: { xs: 0.5, sm: 1, md: 2 }
                  }}>HỌ VÀ TÊN</TableCell>
                  <TableCell align="center" sx={{
                    fontWeight: 'bold',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    px: { xs: 0.5, sm: 1, md: 2 }
                  }}>ĐĂNG KÝ</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredStudents.map((student, index) => (
                  <TableRow key={student.id} hover>
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell>{student.hoVaTen}</TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={student.registered}
                        onChange={() => toggleRegister(index)}                        
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Stack spacing={2} sx={{ mt: 4, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={isSaving}
            sx={{ width: 160, fontWeight: 600, py: 1 }}
          >
            {isSaving ? '🔄 Lưu' : 'Lưu'}
          </Button>

          {alertInfo.open && (
            <Alert severity={alertInfo.severity} sx={{ width: '92%' }}>
              {alertInfo.message}
            </Alert>
          )}

          <Button onClick={onBack} color="secondary">
            ⬅️ Quay lại
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
