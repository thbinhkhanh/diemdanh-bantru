// === FILE: ChotSoLieu.jsx ===
import React, { useState } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, LinearProgress, Stack, Alert,
  IconButton
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

// === Tóm tắt theo dòng (Group / Lớp) ===
function SummaryRow({ row, openGroups, setOpenGroups, summaryData }) {
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
            setOpenGroups(isOpen ? [] : [row.group]);
          }
        }}
      >
        <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>
          {isGroup && !isTruong && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpenGroups(isOpen ? [] : [row.group]);
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

// === Component chính ===
export default function ChotSoLieu({ onBack }) {
  const [openGroups, setOpenGroups] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleUpdate = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setShowSuccess(false);
    setSummaryData([]);

    const loginRole = localStorage.getItem("loginRole");
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (loginRole !== "admin" && loginRole !== "yte") {
      setIsLoading(false);
      setErrorMessage("❌ Bạn không có quyền cập nhật dữ liệu!");
      return;
    }

    if (loginRole === "yte" && selected < today) {
      setIsLoading(false);
      setErrorMessage("⚠️ Chỉ được cập nhật hôm nay hoặc tương lai!");
      return;
    }

    const formattedDate = new Date(selected.getTime() + 7 * 3600 * 1000).toISOString().split("T")[0];

    try {
      const yearDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const yearValue = yearDoc.exists() ? yearDoc.data().value : null;

      if (!yearValue) {
        setIsLoading(false);
        setErrorMessage("❌ Không tìm thấy năm học!");
        return;
      }

      const studentSnap = await getDocs(collection(db, `DANHSACH_${yearValue}`));

      const lopMap = {};
      const truong = { siSo: 0, anBanTru: 0 };

      studentSnap.forEach(docSnap => {
        const lop = docSnap.id.trim();
        const khoi = lop.split(".")[0];
        const data = docSnap.data();

        if (!lop || !khoi) return;

        if (!lopMap[khoi]) lopMap[khoi] = { siSo: 0, anBanTru: 0, children: {} };
        if (!lopMap[khoi].children[lop]) lopMap[khoi].children[lop] = { siSo: 0, anBanTru: 0 };

        Object.entries(data).forEach(([_, value]) => {
          if (!Array.isArray(value)) return;

          value.forEach(hs => {
            if (hs && typeof hs === "object" && hs.dangKyBanTru === true) {
              lopMap[khoi].siSo += 1;
              lopMap[khoi].children[lop].siSo += 1;
              truong.siSo += 1;

              if (hs.diemDanhBanTru === true) {
                lopMap[khoi].anBanTru += 1;
                lopMap[khoi].children[lop].anBanTru += 1;
                truong.anBanTru += 1;
              }
            }
          });
        });
      });

      const summary = [];

      Object.keys(lopMap).sort().forEach(khoi => {
        const group = lopMap[khoi];
        summary.push({ group: `KHỐI ${khoi}`, siSo: group.siSo, anBanTru: group.anBanTru, isGroup: true });

        Object.keys(group.children).sort().forEach(lop => {
          const item = group.children[lop];
          summary.push({ group: lop, siSo: item.siSo, anBanTru: item.anBanTru, isGroup: false });
        });
      });

      summary.push({ group: "TRƯỜNG", siSo: truong.siSo, anBanTru: truong.anBanTru, isGroup: true });

      setSummaryData(summary);
      setShowSuccess(true);

      // === Ghi danh sách điểm danh bán trú vào Firestore ===
      const attendanceRef = doc(db, `BANTRU_${yearValue}`, formattedDate);
      const oldDoc = await getDoc(attendanceRef);
      let currentSet = new Set(oldDoc.exists() ? oldDoc.data().danhSachAn : []);
      let newList = [], removed = [];

      studentSnap.forEach(docSnap => {
        const data = docSnap.data();

        Object.values(data).forEach(field => {
          if (!Array.isArray(field)) return;

          field.forEach(hs => {
            const { maDinhDanh, dangKyBanTru, diemDanhBanTru } = hs;
            if (!maDinhDanh || !dangKyBanTru) return;

            if (diemDanhBanTru === true) {
              currentSet.add(maDinhDanh);
              newList.push(maDinhDanh);
            } else if (diemDanhBanTru === false && currentSet.has(maDinhDanh)) {
              currentSet.delete(maDinhDanh);
              removed.push(maDinhDanh);
            }
          });
        });
      });

      await setDoc(attendanceRef, {
        ngay: formattedDate,
        danhSachAn: Array.from(currentSet),
      });

      //console.log("✅ Đã cập nhật:", formattedDate, "| Ghi mới:", newList.length, "| Xoá:", removed.length);
    } catch (err) {
      console.error("❌ Lỗi khi xử lý:", err);
      setErrorMessage("❌ Có lỗi xảy ra khi cập nhật!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: { xs: '100%', sm: 500 }, mx: 'auto', px: { xs: 0.5, sm: 2 }, mt: 0 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4, mt: 2 }}>
        <Typography variant="h5" fontWeight="bold" color="primary" align="center">
          CHỐT SỐ LIỆU
        </Typography>

        <Box sx={{ height: "2px", width: "100%", backgroundColor: "#1976d2", borderRadius: 1, mt: 2, mb: 4 }} />

        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3, mt: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <DatePicker
              label="Chọn ngày"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  sx: {
                    minWidth: 150,
                    maxWidth: 180,
                    "& input": { textAlign: "center" },
                  },
                },
              }}
            />
          </LocalizationProvider>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            disabled={isLoading}
            sx={{ fontSize: { xs: "0.75rem", sm: "1rem" }, minWidth: 120, height: 40, textTransform: "none" }}
          >
            CẬP NHẬT
          </Button>
        </Stack>

        {isLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
            <LinearProgress sx={{ width: '50%', mb: 2 }} />
            <Typography variant="body2" color="textSecondary">Đang cập nhật dữ liệu...</Typography>
          </Box>
        )}

        {summaryData.length > 0 && (
          <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1976d2' }}>
                  <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>LỚP / KHỐI</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>SĨ SỐ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", color: "white" }}>ĂN BÁN TRÚ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryData.filter(r => r.isGroup).map((row, i) => (
                  <SummaryRow key={i} row={row} openGroups={openGroups} setOpenGroups={setOpenGroups} summaryData={summaryData} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {showSuccess && <Alert severity="success" sx={{ mt: 3 }}>✅ Dữ liệu đã được cập nhật!</Alert>}
        {errorMessage && <Alert severity="error" sx={{ mt: 3 }}>{errorMessage}</Alert>}

        <Stack sx={{ mt: 3 }}>
          <Button onClick={onBack} color="secondary" fullWidth>⬅️ Quay lại</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
