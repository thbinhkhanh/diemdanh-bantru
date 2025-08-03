import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Stack, Button, IconButton, LinearProgress
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { getDocs, getDoc, collection, doc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { format } from "date-fns";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useClassList } from "./context/ClassListContext";

function groupDataFromNhatKy(data, danhSachLop) {
  const khoiData = {};
  let truongCoPhep = 0;
  let truongKhongPhep = 0;

  // ⚙️ Khởi tạo cấu trúc KHỐI / LỚP từ danhSachLop
  //console.log("📘 Danh sách lớp lấy được từ Firestore:", Object.keys(danhSachLop));
  for (const lop of Object.keys(danhSachLop)) {
    const khoi = lop.split(".")[0];

    if (!khoiData[khoi]) {
      khoiData[khoi] = {
        group: `KHỐI ${khoi}`,
        coPhep: 0,
        khongPhep: 0,
        isGroup: true,
        children: {},
      };
    }

    if (!khoiData[khoi].children[lop]) {
      khoiData[khoi].children[lop] = {
        group: lop,
        coPhep: 0,
        khongPhep: 0,
        isGroup: false,
      };
    }
  }

  // 🔢 Đếm dữ liệu điểm danh (duy nhất 1 lần)
  data.forEach(entry => {
    const lop = entry.lop?.toString().trim();
    const khoi = lop?.split(".")[0];
    const phep = entry.phep === true;

    if (!lop || !khoi) return;

    // Tự thêm nếu lớp chưa có trong danhSachLop
    if (!khoiData[khoi]) {
      khoiData[khoi] = {
        group: `KHỐI ${khoi}`,
        coPhep: 0,
        khongPhep: 0,
        isGroup: true,
        children: {},
      };
    }

    if (!khoiData[khoi].children[lop]) {
      khoiData[khoi].children[lop] = {
        group: lop,
        coPhep: 0,
        khongPhep: 0,
        isGroup: false,
      };
    }

    if (phep) {
      khoiData[khoi].coPhep += 1;
      khoiData[khoi].children[lop].coPhep += 1;
      truongCoPhep += 1;
    } else {
      khoiData[khoi].khongPhep += 1;
      khoiData[khoi].children[lop].khongPhep += 1;
      truongKhongPhep += 1;
    }
  });

  // 📊 Chuẩn bị dữ liệu bảng thống kê
  const summaryData = [];
  const khoiList = Object.keys(khoiData).sort();

  for (const khoi of khoiList) {
    const khoiItem = khoiData[khoi];
    summaryData.push({
      group: khoiItem.group,
      coPhep: khoiItem.coPhep,
      khongPhep: khoiItem.khongPhep,
      isGroup: true,
    });

    const lopList = Object.keys(khoiItem.children).sort();
    for (const lop of lopList) {
      summaryData.push(khoiItem.children[lop]);
    }
  }

  // ➕ Thêm tổng trường
  summaryData.push({
    group: "TRƯỜNG",
    coPhep: truongCoPhep,
    khongPhep: truongKhongPhep,
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
        <TableCell align="center" sx={{ fontWeight: "bold" }}>{row.coPhep}</TableCell>
        <TableCell align="center" sx={{ fontWeight: "bold" }}>{row.khongPhep}</TableCell>
      </TableRow>

      {isGroup && isOpen &&
        subRows.map((subRow, i) => (
          <TableRow key={i} sx={{ backgroundColor: "#f9fbe7", "&:hover": { backgroundColor: "#f0f4c3" } }}>
            <TableCell sx={{ pl: 6, textAlign: "center" }}>{subRow.group}</TableCell>
            <TableCell align="center">{subRow.coPhep}</TableCell>
            <TableCell align="center">{subRow.khongPhep}</TableCell>
          </TableRow>
        ))}
    </>
  );
}

export default function ThongKeNgay_DiemDanh({ onBack }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dataList, setDataList] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [openGroups, setOpenGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { classLists } = useClassList();
  const { getClassList, setClassListForKhoi } = useClassList();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        //console.log("🔄 Bắt đầu tải dữ liệu điểm danh...");

        // 📅 Lấy năm học hiện tại
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

        //console.log("📘 Năm học hiện tại:", namHocValue);

        if (!namHocValue) {
          console.error("❌ Không tìm thấy năm học hiện tại!");
          setIsLoading(false);
          return;
        }

        const ngayChon = format(selectedDate, "yyyy-MM-dd");
        //console.log("📅 Ngày được chọn:", ngayChon);

        // 📄 Truy vấn điểm danh theo ngày
        const q = query(
          collection(db, `DIEMDANH_${namHocValue}`),
          where("ngay", "==", ngayChon)
        );
        const snapshot = await getDocs(q);
        const diemDanhData = snapshot.docs.map((doc) => doc.data());

        //console.log("📄 Số bản ghi điểm danh truy được:", diemDanhData.length);

        // ⚡️ Lấy danh sách lớp từ context hoặc Firestore nếu chưa có
        let danhSachLop = {};
        const cachedList = getClassList("TRUONG");
        //console.log("📦 Danh sách lớp từ cache:", cachedList);

        if (cachedList.length > 0) {
          cachedList.forEach((lop) => {
            if (typeof lop === "string") {
              danhSachLop[lop.trim()] = true;
            }
          });
          //console.log("✅ Đã sử dụng danh sách lớp từ cache:", Object.keys(danhSachLop));
        } else {
          //console.log("🔍 Không có cache, đang tải từ Firestore...");
          const docRef = doc(db, `CLASSLIST_${namHocValue}`, "TRUONG");
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const list = docSnap.data().list || [];
            //console.log("📥 Danh sách lớp từ Firestore:", list);

            list.forEach((lop) => {
              if (typeof lop === "string") {
                danhSachLop[lop.trim()] = true;
              }
            });
            setClassListForKhoi("TRUONG", list);
            //console.log("✅ Đã lưu danh sách lớp vào context:", Object.keys(danhSachLop));
          } else {
            console.warn(`⚠️ Không tìm thấy CLASSLIST_${namHocValue}/TRUONG`);
          }
        }

        //console.log("📊 Danh sách lớp dùng để thống kê:", Object.keys(danhSachLop));

        // 📊 Gộp dữ liệu điểm danh theo lớp
        const summary = groupDataFromNhatKy(diemDanhData, danhSachLop);

        setDataList(diemDanhData);
        setSummaryData(summary);
        //console.log("✅ Dữ liệu đã được cập nhật vào state");
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);



  return (
    <Box sx={{ maxWidth: 500, margin: "auto", p: 1, mt: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" fontWeight="bold" color="primary" align="center" sx={{ mb: 1 }}>
            ĐIỂM DANH NGÀY
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
          <Box sx={{ width: "50%", mx: "auto", mt: 2 }}>
            <LinearProgress />
          </Box>
        )}

        <TableContainer component={Paper} sx={{ mt: 2, borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1976d2' }}>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>LỚP / KHỐI</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>CÓ PHÉP</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>KHÔNG PHÉP</TableCell>
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
