import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Stack, MenuItem,
  Select, FormControl, InputLabel, LinearProgress, Button,
  useMediaQuery, useTheme
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { getDoc, getDocs, doc, collection, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "./firebase";
import { MySort } from './utils/MySort';
import { exportDiemDanhThang } from './utils/exportDiemDanhThang';
import { useClassList } from "./context/ClassListContext";
import { useClassData } from "./context/ClassDataContext";
import { enrichStudents } from "./pages/ThanhPhan/enrichStudents";

// ✅ Hàm formatDiemDangThang tích hợp bên trong file
const formatDiemDangThang = (dataList, daySet) => {
  return dataList.map(item => {
    const percentNghi = item.total && daySet.length
      ? Math.round((item.total / daySet.length) * 100)
      : 0;
    return {
      ...item,
      percentNghi,
    };
  });
};

export default function DiemDanhThang({ onBack }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedClass, setSelectedClass] = useState("");
  const [classList, setClassList] = useState([]);
  const [dataList, setDataList] = useState([]);
  const [daySet, setDaySet] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { getClassList, setClassListForKhoi } = useClassList();
  const { getClassData, setClassData } = useClassData();

  const headCellStyle = {
    fontWeight: "bold",
    backgroundColor: theme.palette.primary.main, // ✅ đổi từ `theme.palette.grey[200]`
    color: "#fff",                                // ✅ chữ màu trắng
    border: "1px solid #ccc",
  };

  useEffect(() => {
    const fetchClassList = async () => {
      try {
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

        if (!namHocValue) {
          console.error("❌ Không tìm thấy năm học hợp lệ trong hệ thống!");
          return;
        }

        const cachedList = getClassList("TRUONG");
        if (cachedList.length > 0) {
          setClassList(cachedList);
          setSelectedClass(cachedList[0]);
          return;
        }

        const docRef = doc(db, `CLASSLIST_${namHocValue}`, "TRUONG");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const list = docSnap.data().list || [];
          setClassList(list);
          setSelectedClass(list[0] || "");
          setClassListForKhoi("TRUONG", list);
        } else {
          console.warn(`⚠️ Không tìm thấy CLASSLIST_${namHocValue}/TRUONG`);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải danh sách lớp:", err);
      }
    };

    fetchClassList();
  }, []);

  // ✅ Xử lý dữ liệu học sinh
  const processStudentData = (rawStudents, diemDanhData, className, selectedDate) => {
    const selectedDateStr = format(selectedDate, "yyyy-MM");

    const enriched = enrichStudents(rawStudents, selectedDateStr, className, true);

    const enrichedWithRegister = enriched.map((s, index) => {
      const ma = s.maDinhDanh;
      const daySummary = {};
      let total = 0;

      diemDanhData.forEach(record => {
        if (
          record.maDinhDanh === ma &&
          record.lop === className &&
          record.thang === selectedDateStr &&
          record.ngay
        ) {
          const dateObj = new Date(record.ngay);
          if (!isNaN(dateObj)) {
            const day = dateObj.getDate();
            daySummary[day] = {
              phep: record.phep,
              lyDo: record.lyDo || ""
            };
            total += 1;
          }
        }
      });

      return {
        ...s,
        stt: index + 1,
        daySummary,
        total
      };
    });

    const sorted = MySort(enrichedWithRegister).map((s, idx) => ({
      ...s,
      stt: idx + 1
    }));

    // ✅ Gọi formatDiemDangThang ở đây
    const formatted = formatDiemDangThang(sorted, daySet);

    setDataList(formatted);
  };

  useEffect(() => {
    if (!selectedClass || !selectedDate) return;

    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;
        if (!namHocValue) {
          console.error("❌ Không tìm thấy năm học!");
          return;
        }

        let rawData = getClassData(selectedClass);
        if (!Array.isArray(rawData) || rawData.length === 0) {
          const danhSachSnap = await getDocs(query(
            collection(db, `DANHSACH_${namHocValue}`),
            where("lop", "==", selectedClass)
          ));
          const danhSachData = danhSachSnap.docs.map(d => d.data());

          const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
          const enriched = enrichStudents(danhSachData, selectedDateStr, selectedClass, true);
          const enrichedWithId = enriched.map(hs => ({
            ...hs,
            id: hs.maDinhDanh || hs.id || hs.uid || `missing-${Math.random().toString(36).substring(2)}`
          }));
          setClassData(selectedClass, enrichedWithId);
          rawData = enrichedWithId;
        }

        const diemDanhSnap = await getDocs(collection(db, `DIEMDANH_${namHocValue}`));
        const diemDanhData = diemDanhSnap.docs.map(doc => doc.data());

        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const fullDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        setDaySet(fullDays);

        processStudentData(rawData, diemDanhData, selectedClass, selectedDate);
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedDate]);

  const handleExport = () => {
    exportDiemDanhThang(dataList, selectedDate, selectedClass, daySet);
  };

  return (
    <Box sx={{ width: "100%", overflowX: "auto", mt: 2, px: 1 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: showDays ? 0 : 4,
          mx: "auto",
          overflowX: "auto",
          ...(showDays
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1300,
                backgroundColor: "white",
                overflow: "auto",
              }
            : {
                width: "max-content",
              }),
        }}
      >
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" fontWeight="bold" color="primary" align="center" sx={{ mb: 1 }}>
            {`ĐIỂM DANH THÁNG ${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`}
          </Typography>
          <Box sx={{ height: "2.5px", width: "100%", backgroundColor: "#1976d2", borderRadius: 1, mt: 2, mb: 4 }} />
        </Box>

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" flexWrap="wrap" sx={{ mb: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <DatePicker
              label="Chọn tháng"
              views={["year", "month"]}
              openTo="month"
              value={selectedDate}
              onChange={(newValue) => {
                if (newValue instanceof Date && !isNaN(newValue)) {
                  setSelectedDate(new Date(newValue.getFullYear(), newValue.getMonth(), 1));
                }
              }}
              format="MM/yyyy"
              slotProps={{
                textField: {
                  size: "small",
                  sx: { minWidth: 100, maxWidth: 160, "& input": { textAlign: "center" } },
                  InputProps: {
                    inputComponent: (props) => {
                      const month = selectedDate.getMonth() + 1;
                      const year = selectedDate.getFullYear();
                      return <input {...props} value={`Tháng ${month}`} readOnly />;
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Lớp</InputLabel>
            <Select value={selectedClass} label="Lớp" onChange={(e) => setSelectedClass(e.target.value)}>
              {classList.map((cls, idx) => (
                <MenuItem key={idx} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={() => setShowDays((prev) => !prev)}>
            {showDays ? "ẨN ngày" : "HIỆN ngày"}
          </Button>

          {!isMobile && (
            <Button variant="contained" color="success" onClick={handleExport}>
              📥 Xuất Excel
            </Button>
          )}
        </Stack>

        {isLoading && <LinearProgress sx={{ width: "50%", mx: "auto", my: 2 }} />}

        <TableContainer component={Paper} sx={{ borderRadius: 2, mt: 2 }}>
          <Table size="small" sx={{ borderCollapse: "collapse" }}>
            <TableHead>
              <TableRow sx={{ height: 48 }}>
                <TableCell align="center" sx={{ ...headCellStyle, position: "sticky", left: 0, zIndex: 2 }}>
                  STT
                </TableCell>
                <TableCell align="center" sx={{ ...headCellStyle, minWidth: 140, position: "sticky", left: 48, zIndex: 2 }}>
                  HỌ VÀ TÊN
                </TableCell>
                {showDays &&
                  daySet.map((d) => {
                    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
                    const dayOfWeek = date.getDay();
                    let bgColor = "#1976d2",
                      textColor = "white";
                    if (dayOfWeek === 0) {
                      bgColor = "#ffcdd2";
                      textColor = "#c62828";
                    } else if (dayOfWeek === 6) {
                      bgColor = "#bbdefb";
                      textColor = "#1565c0";
                    }
                    return (
                      <TableCell
                        key={d}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: bgColor,
                          color: textColor,
                          minWidth: 20,
                          px: 1,
                          border: "1px solid #ccc",
                        }}
                      >
                        {d}
                      </TableCell>
                    );
                  })}
                <TableCell align="center" sx={{ ...headCellStyle, minWidth: 70 }}>
                  TỔNG CỘNG
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {dataList.map((student) => (
                <TableRow
                  key={student.id}
                  sx={{
                    height: 48,                    
                    "& td": { border: "1px solid #ccc", py: 1 },
                  }}
                >
                  <TableCell
                    align="center"
                    sx={{
                      width: 48,
                      px: 1,
                      position: "sticky",
                      left: 0,
                      backgroundColor: "#fff",
                      zIndex: 1,
                    }}
                  >
                    {student.stt}
                  </TableCell>

                  <TableCell
                    sx={{
                      minWidth: 140,
                      px: 1,
                      position: "sticky",
                      left: 48,
                      backgroundColor: "#fff",
                      zIndex: 1,
                    }}
                  >
                    {student.hoVaTen}
                  </TableCell>

                  {showDays &&
                    daySet.map((d) => {
                      const info = student.daySummary?.[d];  // d là chuỗi ngày, VD: "2025-07-10"
                      const phep = info?.phep;
                      const loai = phep === true ? "P" : phep === false ? "K" : "";
                      const lydo = info?.lyDo ?? "";
                      const tooltip = lydo?.trim()
                        ? lydo
                        : loai === "K"
                          ? "Không rõ lý do"
                          : undefined;

                      return (
                        <TableCell
                          key={`${student.id}-${d}`}  // tránh lỗi "Each child needs a unique key"
                          align="center"
                          sx={{ px: 1 }}
                          title={tooltip}
                        >
                          {loai}
                        </TableCell>
                      );
                    })}

                  <TableCell align="center" sx={{px: 1 }}>                    
                    {student.total > 0 ? student.total : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>

        {isMobile && (
          <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="success"
              onClick={handleExport}
              fullWidth
              sx={{
                maxWidth: { xs: 150, sm: 280 },
                fontSize: { xs: "13px", sm: "15px" },
                height: { xs: 38, sm: 44 },
                fontWeight: "bold",
                px: { xs: 1, sm: 2 },
              }}
            >
              📥 Xuất Excel
            </Button>
          </Box>
        )}

        <Stack spacing={2} sx={{ mt: 4, alignItems: "center" }}>
          <Button onClick={onBack} color="secondary">
            ⬅️ Quay lại
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
