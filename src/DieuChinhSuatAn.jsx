import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Stack, MenuItem,
  Select, FormControl, InputLabel, LinearProgress, Button,
  Checkbox, Alert, Card, CardContent
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { getDocs, getDoc, setDoc, collection, query, where, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { MySort } from './utils/MySort';
import { useClassList } from "./context/ClassListContext";
import { useClassData } from "./context/ClassDataContext";
import { enrichStudents } from "./pages/ThanhPhan/enrichStudents";

export default function DieuChinhSuatAn({ onBack }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState(null);
  const [classList, setClassList] = useState([]);
  const [dataList, setDataList] = useState([]);
  const [originalChecked, setOriginalChecked] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [namHocValue, setNamHocValue] = useState(null);
  const { getClassList, setClassListForKhoi } = useClassList();
  const { getClassData, setClassData } = useClassData();
  const [fetchedClasses, setFetchedClasses] = useState({});

  useEffect(() => {
    if (saveSuccess !== null) {
      const timer = setTimeout(() => setSaveSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  useEffect(() => {
    const fetchNamHocAndClassList = async () => {
      try {
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHoc = namHocDoc.exists() ? namHocDoc.data().value : null;

        if (!namHoc) {
          setIsLoading(false);
          setSaveSuccess("❌ Không tìm thấy năm học hợp lệ trong hệ thống!");
          return;
        }

        setNamHocValue(namHoc);

        // 🧠 Kiểm tra trước trong context
        const cachedList = getClassList("TRUONG");
        if (cachedList.length > 0) {
          //console.log("📦 Danh sách lớp lấy từ CONTEXT:", cachedList);
          setClassList(cachedList);
          setSelectedClass(cachedList[0]);
          await fetchStudents(cachedList[0], namHoc);
          return;
        }

        // 📥 Nếu chưa có → tải từ Firestore
        const classListDoc = await getDoc(doc(db, `CLASSLIST_${namHoc}`, "TRUONG"));
        if (classListDoc.exists()) {
          const data = classListDoc.data();
          const list = data.list || [];

          //console.log("🗂️ Danh sách lớp lấy từ FIRESTORE:", list);
          setClassList(list);
          setSelectedClass(list[0] || "");

          setClassListForKhoi("TRUONG", list); // 🔁 Lưu vào context

          if (list.length > 0) {
            await fetchStudents(list[0], namHoc);
          }
        } else {
          console.warn("⚠️ Không tìm thấy CLASSLIST trong Firestore");
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu:", err);
        setIsLoading(false);
      }
    };

    fetchNamHocAndClassList();
  }, []);


  const fetchStudents = async (className, nhValue = namHocValue) => {
    if (!nhValue || !className || !selectedDate) return;

    setIsLoading(true);

    try {
      const cached = getClassData?.(className);
      const alreadyFetched = fetchedClasses?.[className];
      const shouldFetch = !Array.isArray(cached) || cached.length === 0;

      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      const adjustedDate = new Date(selected.getTime() + 7 * 60 * 60 * 1000);
      const selectedDateStr = adjustedDate.toISOString().split("T")[0];

      let students = [];

      if (!shouldFetch || alreadyFetched) {
        //console.log(`📦 Dữ liệu lớp ${className} lấy từ context hoặc đã cached.`);
        students = cached;
      } else {
        //console.log(`🌐 Dữ liệu lớp ${className} đang được lấy từ Firestore...`);
        const docRef = doc(db, `DANHSACH_${nhValue}`, className);
        const docSnap = await getDoc(docRef);

        const rawStudents = [];

        if (docSnap.exists()) {
          const data = docSnap.data();
          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              //console.log(`📚 Duyệt danh sách học sinh trong field: ${key}`);
              value.forEach(hs => {
                if (hs && typeof hs === "object") {
                  rawStudents.push({
                    ...hs,
                    id: hs.maDinhDanh || `${className}_${key}_${Math.random().toString(36).slice(2)}`
                  });
                } else {
                  //console.log("⚠️ Phần tử không hợp lệ:", hs);
                }
              });
            } else {
              //console.log(`⏭️ Field ${key} không phải mảng học sinh`);
            }
          });
        } else {
          console.warn(`⚠️ Không tìm thấy lớp ${className} trong Firestore.`);
        }

        students = enrichStudents(rawStudents, selectedDateStr, className, true);
        setClassData?.(className, students);
        setFetchedClasses?.(prev => ({ ...prev, [className]: true }));
      }

      // 🔍 Lấy danh sách học sinh đã đăng ký ăn trưa
      const banTruDocRef = doc(db, `BANTRU_${nhValue}`, selectedDateStr);
      const banTruSnap = await getDoc(banTruDocRef);
      let banTruList = [];
      if (banTruSnap.exists()) {
        banTruList = banTruSnap.data().danhSachAn || [];
      }

      const banTruSet = new Set(banTruList);

      const enriched = students.map((s, i) => ({
        ...s,
        stt: i + 1,
        registered: banTruSet.has(s.maDinhDanh),
        disabled: false
      }));

      const checkedMap = {};
      enriched.forEach(s => {
        checkedMap[s.maDinhDanh] = s.registered;
      });

      setDataList(enriched);
      setOriginalChecked(checkedMap);
      setClassData?.(className, enriched); // ✅ lưu đầy đủ vào context
    } catch (err) {
      console.error("❌ Lỗi khi tải học sinh:", err);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (selectedClass && namHocValue) fetchStudents(selectedClass);
  }, [selectedDate]);

  const saveData = async () => {
    if (isSaving || !namHocValue) return;

    const changed = dataList.filter(
      s => s.registered !== originalChecked[s.maDinhDanh]
    );

    if (changed.length === 0) {
      setSaveSuccess(null);
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);

    try {
      const adjustedDate = new Date(selectedDate.getTime() + 7 * 60 * 60 * 1000);
      const selectedDateStr = adjustedDate.toISOString().split("T")[0];
      const banTruDocRef = doc(db, `BANTRU_${namHocValue}`, selectedDateStr);
      const banTruSnap = await getDoc(banTruDocRef);

      let danhSachAn = [];
      if (banTruSnap.exists()) {
        danhSachAn = banTruSnap.data().danhSachAn || [];
      }

      const updatedSet = new Set(danhSachAn);

      changed.forEach(s => {
        const before = originalChecked[s.maDinhDanh];
        const after = s.registered;

        if (!before && after) updatedSet.add(s.maDinhDanh);
        if (before && !after) updatedSet.delete(s.maDinhDanh);
      });

      await setDoc(banTruDocRef, {
        ngay: selectedDateStr,
        danhSachAn: Array.from(updatedSet),
      }, { merge: true });

      const updated = { ...originalChecked };
      changed.forEach(s => updated[s.maDinhDanh] = s.registered);
      setOriginalChecked(updated);
      setSaveSuccess(true);
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật BANTRU:", err);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClassChange = async (e) => {
    setSelectedClass(e.target.value);
    await fetchStudents(e.target.value);
  };


  const handleDateChange = nv => {
    if (nv instanceof Date && !isNaN(nv)) setSelectedDate(nv);
  };

  const toggleRegister = idx => {
    setDataList(prev => {
      // Đổi trạng thái registered
      const newList = prev.map((s, i) => i === idx ? { ...s, registered: !s.registered } : s);
      // Cập nhật lại stt theo vị trí mới
      return newList.map((s, i) => ({ ...s, stt: i + 1 }));
    });
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 0 }}>
      <Card sx={{
        mt:2,
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: 450,
        width: { xs: '98%', sm: '100%' },
        borderRadius: 4,
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        backgroundColor: 'white',
      }} elevation={10}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" align="center" fontWeight="bold" color="primary" gutterBottom>
              ĐIỀU CHỈNH SUẤT ĂN
            </Typography>
            <Box sx={{
              height: "2.5px",
              width: "100%",
              backgroundColor: "#1976d2",
              borderRadius: 1,
              mt: 2, mb: 4,
            }} />
          </Box>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker label="Chọn ngày" value={selectedDate} onChange={handleDateChange} slotProps={{
                textField: { size: "small", sx: { minWidth: 150, maxWidth: 180, "& input": { textAlign: "center" } } }
              }} />
            </LocalizationProvider>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Lớp</InputLabel>
              <Select value={selectedClass || ""} label="Lớp" onChange={handleClassChange}>
                {classList.map((cls, i) => (
                  <MenuItem key={i} value={cls}>{cls}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {isLoading && <LinearProgress />}
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, border: "1px solid #e0e0e0", mt: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {["STT", "HỌ VÀ TÊN", "ĐĂNG KÝ"].map((h, i) => (
                    <TableCell key={i} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#1976d2', color: 'white', px: { xs: 0.5, sm: 1, md: 2 } }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dataList
                  .filter(s => s.dangKyBanTru === true)
                  .map((s, i) => (
                    <TableRow key={s.maDinhDanh} hover>
                      <TableCell align="center">{i + 1}</TableCell>
                      <TableCell>{s.hoVaTen}</TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={s.registered}
                          onChange={() => {
                            const realIdx = dataList.findIndex(d => d.maDinhDanh === s.maDinhDanh);
                            toggleRegister(realIdx);
                          }}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                    </TableRow>
                ))}

              </TableBody>
            </Table>
          </TableContainer>

          <Stack spacing={2} sx={{ mt: 3, alignItems: "center" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={saveData}
              disabled={isSaving}
              sx={{ width: 160, fontWeight: 600 }}
            >
              {isSaving ? "🔄 Cập nhật" : "Cập nhật"}
            </Button>

            {saveSuccess === "unauthorized" && (
              <Alert severity="error" sx={{ width: "100%", textAlign: 'left' }}>
                ❌ Bạn không có quyền điều chỉnh suất ăn!
              </Alert>
            )}

            {saveSuccess === true && (
              <Alert severity="success" sx={{ width: "92%", textAlign: 'left' }}>
                ✅ Cập nhật thành công!
              </Alert>
            )}

            {saveSuccess === false && (
              <Alert severity="error" sx={{ width: "100%", textAlign: 'left' }}>
                ❌ Lỗi khi lưu dữ liệu!
              </Alert>
            )}

            {isSaving && (
              <Alert severity="info" sx={{ width: "92%", textAlign: 'left' }}>
                🔄 Đang lưu dữ liệu...
              </Alert>
            )}

            <Button onClick={onBack} color="secondary">
              ⬅️ Quay lại
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
