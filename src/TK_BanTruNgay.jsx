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

function groupData(banTruDataRaw, danhSachData, sisoData) {
  const banTruData = Array.isArray(banTruDataRaw)
    ? banTruDataRaw
    : Object.values(banTruDataRaw || {});
  const banTruIds = new Set(banTruData.map(id => id?.trim()));

  const khoiData = {};
  let truongSiSo = 0;
  let truongAn = 0;

  // ✅ Lấy sĩ số từ sisoData flat map
  if (sisoData && typeof sisoData === "object") {
    Object.entries(sisoData).forEach(([lop, si]) => {
      if (!lop || typeof si !== "number") return;
      const khoi = lop.split(".")[0];

      if (!khoiData[khoi]) {
        khoiData[khoi] = {
          group: `KHỐI ${khoi}`,
          siSo: 0,
          anBanTru: 0,
          isGroup: true,
          children: {},
        };
      }

      khoiData[khoi].children[lop] = {
        group: lop,
        siSo: si,
        anBanTru: 0,
        isGroup: false,
      };

      khoiData[khoi].siSo += si;
      truongSiSo += si;
    });
  } else {
    // Nếu không có sisoData, tính sĩ số từ danhSachData
    danhSachData.forEach(student => {
      const { maDinhDanh, lop, dangKyBanTru } = student;
      if (!lop || !maDinhDanh) return;
      const khoi = lop.split(".")[0];

      if (!khoiData[khoi]) {
        khoiData[khoi] = {
          group: `KHỐI ${khoi}`,
          siSo: 0,
          anBanTru: 0,
          isGroup: true,
          children: {},
        };
      }

      if (!khoiData[khoi].children[lop]) {
        khoiData[khoi].children[lop] = {
          group: lop,
          siSo: 0,
          anBanTru: 0,
          isGroup: false,
        };
      }

      if (dangKyBanTru) {
        khoiData[khoi].children[lop].siSo += 1;
        khoiData[khoi].siSo += 1;
        truongSiSo += 1;
      }
    });
  }

  // ✅ Tăng số ăn bán trú
  danhSachData.forEach(student => {
    const { maDinhDanh, lop } = student;
    if (!lop || !maDinhDanh) return;
    const khoi = lop.split(".")[0];
    const maID = maDinhDanh.trim();

    if (!khoiData[khoi] || !khoiData[khoi].children[lop]) return;

    if (banTruIds.has(maID)) {
      khoiData[khoi].children[lop].anBanTru += 1;
      khoiData[khoi].anBanTru += 1;
      truongAn += 1;
    }
  });

  // ✅ Tạo summaryData
  const summaryData = [];
  Object.keys(khoiData).sort().forEach(khoi => {
    const khoiItem = khoiData[khoi];
    summaryData.push({
      group: khoiItem.group,
      siSo: khoiItem.siSo,
      anBanTru: khoiItem.anBanTru,
      isGroup: true,
    });

    Object.keys(khoiItem.children).sort().forEach(lop => {
      summaryData.push(khoiItem.children[lop]);
    });
  });

  summaryData.push({
    group: "TRƯỜNG",
    siSo: truongSiSo,
    anBanTru: truongAn,
    isGroup: true,
  });

  return summaryData;
}



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
        subRows.map(subRow => (
          <TableRow key={subRow.group} sx={{ backgroundColor: "#f9fbe7", "&:hover": { backgroundColor: "#f0f4c3" } }}>
            <TableCell sx={{ pl: 6, textAlign: "center" }}>{subRow.group}</TableCell>
            <TableCell align="center">{subRow.siSo}</TableCell>
            <TableCell align="center">{subRow.anBanTru}</TableCell>
          </TableRow>
        ))}
    </>
  );
}

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
        // 📦 Lấy năm học hiện tại
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

        if (!namHocValue) {
          console.error("❌ Không tìm thấy năm học hiện tại!");
          setIsLoading(false);
          return;
        }

        // 🗓 Format ngày thành chuỗi yyyy-MM-dd
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        // 🔄 Tải dữ liệu: bán trú + danh sách toàn trường (nhiều lớp)
        const [banTruDoc, danhSachSnap] = await Promise.all([
          getDoc(doc(db, `BANTRU_${namHocValue}`, dateStr)),
          getDocs(collection(db, `DANHSACH_${namHocValue}`)),
        ]);

        const banTruData = banTruDoc.exists() ? banTruDoc.data().danhSachAn : [];
        const sisoData = banTruDoc.exists() ? banTruDoc.data().siso : null;
        
        // 📚 Duyệt qua các lớp và lấy tất cả học sinh từ các field mảng
        const danhSachData = [];

        danhSachSnap.forEach(doc => {
          const lop = doc.id; // ID tài liệu là tên lớp
          const data = doc.data();

          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(hs => {
                if (hs && typeof hs === "object") {
                  danhSachData.push({
                    ...hs,
                    id: hs.maDinhDanh || `${lop}_${key}_${Math.random().toString(36).slice(2)}`,
                    lop: lop,
                  });
                }
              });
            }
          });
        });

        // 🚀 Gọi hàm thống kê với dữ liệu đã chuẩn hóa
        setDataList(banTruData);
        //const summary = groupData(banTruData, danhSachData);
        const summary = groupData(banTruData, danhSachData, sisoData);
        setSummaryData(summary);
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu:", err);
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
          <Typography variant="h5" fontWeight="bold" color="primary" align="center" sx={{ mb: 1 }}>
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

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        )}

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
                .map(row => (
                  <Row
                    key={row.group}
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