import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Stack, Button, IconButton, LinearProgress
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { getDocs, getDoc, collection, doc } from "firebase/firestore";
import { db } from "./firebase";
import { format } from "date-fns";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Group dữ liệu theo khối và lớp
function groupData(banTruData, danhSachData, selectedDate) {
  const khoiData = {};
  let truongSiSo = 0;
  let truongAn = 0;
  const ngayChon = format(selectedDate, "yyyy-MM-dd");

  // 🔢 Thống kê sĩ số từ DANHSACH_...
  danhSachData.forEach(student => {
    const lop = student.lop?.toString().trim();
    const khoi = lop?.split(".")[0];
    const huyDK = (student.huyDangKy || "").toUpperCase();

    if (!lop || !khoi) return;
    if (huyDK !== "" && huyDK !== "T") return;

    khoiData[khoi] = khoiData[khoi] || {
      group: `KHỐI ${khoi}`,
      siSo: 0,
      anBanTru: 0,
      isGroup: true,
      children: {},
    };

    khoiData[khoi].children[lop] = khoiData[khoi].children[lop] || {
      group: lop,
      siSo: 0,
      anBanTru: 0,
      isGroup: false,
    };

    khoiData[khoi].children[lop].siSo += 1;
    khoiData[khoi].siSo += 1;
    truongSiSo += 1;
  });

  // 🍱 Thống kê ăn bán trú từ BANTRU_... theo ngày chọn
  banTruData.forEach(record => {
    const { lop, khoi, ngay } = record;
    const lopClean = lop?.toString().trim();
    const khoiClean = khoi?.toString().trim();

    if (ngay !== ngayChon || !lopClean || !khoiClean) return;
    if (!khoiData[khoiClean] || !khoiData[khoiClean].children[lopClean]) return;

    khoiData[khoiClean].children[lopClean].anBanTru += 1;
    khoiData[khoiClean].anBanTru += 1;
    truongAn += 1;
  });

  // 📊 Tổng hợp dữ liệu
  const summaryData = [];
  const khoiList = Object.keys(khoiData).sort();

  for (const khoi of khoiList) {
    const khoiItem = khoiData[khoi];
    summaryData.push({
      group: khoiItem.group,
      siSo: khoiItem.siSo,
      anBanTru: khoiItem.anBanTru,
      isGroup: true,
    });

    const lopList = Object.keys(khoiItem.children).sort();
    for (const lop of lopList) {
      summaryData.push(khoiItem.children[lop]);
    }
  }

  summaryData.push({
    group: "TRƯỜNG",
    siSo: truongSiSo,
    anBanTru: truongAn,
    isGroup: true,
  });

  return summaryData;
}

// Component render từng dòng
function Row({ row, openGroups, setOpenGroups, summaryData }) {
  const isOpen = openGroups.includes(row.group);
  const isTruong = row.group === "TRƯỜNG";
  const isGroup = row.isGroup;

  const subRows = summaryData.filter(
    r => !r.isGroup && r.group.startsWith(row.group.split(" ")[1] + ".")
  );

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: isTruong ? "#fff3e0" : "#e3f2fd",
          cursor: isGroup && !isTruong ? "pointer" : "default",
          "&:hover": { backgroundColor: isGroup && !isTruong ? "#bbdefb" : undefined },
        }}
        onClick={() => {
          if (isGroup && !isTruong) {
            setOpenGroups(isOpen ? openGroups.filter(g => g !== row.group) : [...openGroups, row.group]);
          }
        }}
      >
        <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>
          {isGroup && !isTruong && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpenGroups(isOpen ? openGroups.filter(g => g !== row.group) : [...openGroups, row.group]);
              }}
            >
              {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
          {row.group}
        </TableCell>
        <TableCell align="center" sx={{ fontWeight: "bold" }}>{row.siSo}</TableCell>
        <TableCell align="center" sx={{ fontWeight: "bold" }}>{row.anBanTru}</TableCell>
      </TableRow>

      {isGroup && isOpen &&
        subRows.map((subRow, i) => (
          <TableRow key={i} sx={{ backgroundColor: "#f9fbe7", "&:hover": { backgroundColor: "#f0f4c3" } }}>
            <TableCell sx={{ pl: 6, textAlign: "center" }}>{subRow.group}</TableCell>
            <TableCell align="center">{subRow.siSo}</TableCell>
            <TableCell align="center">{subRow.anBanTru}</TableCell>
          </TableRow>
        ))}
    </>
  );
}

// Hàm chính
export default function ThongKeTheoNgay({ onBack }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dataList, setDataList] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [openGroups, setOpenGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

      if (!namHocValue) {
        console.error("❌ Không tìm thấy năm học hiện tại trong hệ thống!");
        setIsLoading(false);
        return;
      }

      const [banTruSnap, danhSachSnap] = await Promise.all([
        getDocs(collection(db, `BANTRU_${namHocValue}`)),
        getDocs(collection(db, `DANHSACH_${namHocValue}`)),
      ]);

      const banTruData = banTruSnap.docs.map(doc => doc.data());
      const danhSachData = danhSachSnap.docs.map(doc => doc.data());

      setDataList(banTruData); // Optional: nếu bạn đang dùng dataList cho việc khác
      const summary = groupData(banTruData, danhSachData, selectedDate);
      setSummaryData(summary);
    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu từ Firebase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [selectedDate]);

  return (
    <Box sx={{ maxWidth: 500, marginLeft: "auto", marginRight: "auto", paddingLeft: 0.5, paddingRight: 0.5, mt: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            color="primary"
            align="center"
            sx={{ mb: 1 }}
          >
            TỔNG HỢP NGÀY
          </Typography>
          <Box sx={{ height: "2px", width: "100%", backgroundColor: "#1976d2", borderRadius: 1, mt: 2, mb: 4 }} />
        </Box>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <Box sx={{ width: 185 }}>
              <DatePicker
                label="Chọn ngày"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      minWidth: 130,
                      maxWidth: 165,
                      "& input": {
                        textAlign: "center",
                        height: "1.4375em",
                      },
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </LocalizationProvider>

        {isLoading && <LinearProgress />}

        <TableContainer component={Paper} sx={{ mt: 2, borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1976d2' }}>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>LỚP / KHỐI</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>SĨ SỐ</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>ĂN BÁN TRÚ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaryData
                .filter(row => row.isGroup)
                .map((row, index) => (
                  <Row
                    key={index}
                    row={row}
                    openGroups={openGroups}
                    setOpenGroups={setOpenGroups}
                    summaryData={summaryData}
                  />
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack spacing={2} sx={{ mt: 4, alignItems: "center" }}>
          <Button onClick={onBack} color="secondary">
            ⬅️ Quay lại
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
