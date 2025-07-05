import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, CircularProgress, Stack, Button,
  TableSortLabel, TableContainer, Select, MenuItem,
  InputLabel, FormControl
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";

export default function NhatKyDiemDanh({ onBack }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterThang, setFilterThang] = useState(today.getMonth() + 1);
  const [filterNam, setFilterNam] = useState(today.getFullYear());
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderBy, setOrderBy] = useState("lop");
  const [order, setOrder] = useState("asc");
  const [filterKhoi, setFilterKhoi] = useState("Tất cả");
  const [filterLop, setFilterLop] = useState("Tất cả");
  const [danhSachLop, setDanhSachLop] = useState([]);

  const danhSachKhoi = ["Tất cả", "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"];

  useEffect(() => {
    const newDate = new Date(filterNam, filterThang - 1, selectedDate.getDate());
    setSelectedDate(newDate);
  }, [filterThang, filterNam]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

      if (!namHocValue) {
        console.error("❌ Không tìm thấy năm học hiện tại!");
        setDataList([]);
        setIsLoading(false);
        return;
      }

      const ngayKey = format(selectedDate, "yyyy-MM-dd");
      const nhatKyDoc = await getDoc(doc(db, `NHATKY_${namHocValue}`, ngayKey));

      if (!nhatKyDoc.exists()) {
        setDataList([]);
        setDanhSachLop([]);
      } else {
        const rawData = nhatKyDoc.data();
        const list = Object.entries(rawData).map(([id, value]) => ({
          id,
          ...value
        }));
        setDataList(list);

        const uniqueLop = [...new Set(list.map(item => item.lop).filter(Boolean))];
        uniqueLop.sort((a, b) => {
          const [numA, suffixA] = a.match(/^(\d+)(.*)/)?.slice(1) || [];
          const [numB, suffixB] = b.match(/^(\d+)(.*)/)?.slice(1) || [];
          if (numA !== numB) return +numA - +numB;
          return (suffixA || "").localeCompare(suffixB || "", "vi", { sensitivity: "base" });
        });
        setDanhSachLop(["Tất cả", ...uniqueLop]);
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortByName = (a, b) => {
    const splitA = a.hoTen?.trim().split(/\s+/) || [];
    const splitB = b.hoTen?.trim().split(/\s+/) || [];
    const [hoA, ...restA] = splitA;
    const [hoB, ...restB] = splitB;
    const tenA = restA.pop();
    const tenB = restB.pop();
    const demA = restA.join(" ").toLowerCase();
    const demB = restB.join(" ").toLowerCase();

    const cmpTen = tenA?.localeCompare(tenB, "vi", { sensitivity: "base" }) || 0;
    if (cmpTen !== 0) return order === "asc" ? cmpTen : -cmpTen;

    const cmpDem = demA?.localeCompare(demB, "vi", { sensitivity: "base" }) || 0;
    if (cmpDem !== 0) return order === "asc" ? cmpDem : -cmpDem;

    return order === "asc"
      ? hoA?.localeCompare(hoB, "vi", { sensitivity: "base" }) || 0
      : hoB?.localeCompare(hoA, "vi", { sensitivity: "base" }) || 0;
  };

  const filteredData = dataList.filter((item) => {
    const lop = item.lop || "";
    const matchLop = filterLop === "Tất cả" || lop === filterLop;
    const matchKhoi = filterKhoi === "Tất cả" || lop.startsWith(filterKhoi.split(" ")[1]);
    return matchLop && matchKhoi;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (orderBy === "hoTen") return sortByName(a, b);
    const valA = (a[orderBy] || "").toString().toLowerCase();
    const valB = (b[orderBy] || "").toString().toLowerCase();
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });

  const handleKhoiChange = (value) => {
    setFilterKhoi(value);
    if (value === "Tất cả") {
      setFilterLop("Tất cả");
    } else {
      setFilterLop("Tất cả"); // vẫn giữ nguyên để đảm bảo lọc theo khối
    }
  };


  const handleLopChange = (value) => {
    setFilterLop(value);
    if (value !== "Tất cả") {
      const khoiSo = value.match(/^\d+/)?.[0];
      setFilterKhoi(khoiSo ? `Khối ${khoiSo}` : "Tất cả");
    }
  };

  return (
    <Box sx={{ width: "95vw", maxWidth: "700px", margin: "auto", p: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4, width: "100%" }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          align="center"
          color="primary"
          sx={{ mb: 5 }}
          sx={{ mb: 4, borderBottom: '3px solid #1976d2', pb: 1 }}
        >
          NHẬT KÝ ĐIỂM DANH
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
              mb: 2,
            }}
          >
            <DatePicker
              label="Chọn ngày"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 140 }, // vừa đủ hiển thị "04/07/2025"
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Tháng</InputLabel>
              <Select
                value={filterThang}
                label="Tháng"
                onChange={(e) => setFilterThang(Number(e.target.value))}
              >
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    Tháng {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Năm</InputLabel>
              <Select
                value={filterNam}
                label="Năm"
                onChange={(e) => setFilterNam(Number(e.target.value))}
              >
                {[...Array(5)].map((_, i) => {
                  const year = today.getFullYear() - i;
                  return (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
        </LocalizationProvider>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Khối</InputLabel>
            <Select value={filterKhoi} label="Khối" onChange={(e) => handleKhoiChange(e.target.value)}>
              {danhSachKhoi.map((k) => (
                <MenuItem key={k} value={k}>{k}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Lớp</InputLabel>
            <Select value={filterLop} label="Lớp" onChange={(e) => handleLopChange(e.target.value)}>
              {danhSachLop.map((l) => (
                <MenuItem key={l} value={l}>{l}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table
              sx={{
                border: "1px solid #ccc",
                borderCollapse: "collapse",
                "& td, & th": {
                  border: "1px solid #ccc",
                  textAlign: "center",
                  padding: "10px 8px",
                },
                "& td.hoten": {
                  textAlign: "left",
                  whiteSpace: "nowrap",
                },
              }}
            >
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1976d2" }}>
                  {[
                    { label: "STT", key: null },
                    { label: "HỌ VÀ TÊN", key: "hoTen" },
                    { label: "LỚP", key: "lop" },
                    { label: "CÓ PHÉP", key: "loai" },
                    { label: "LÝ DO VẮNG", key: "lydo" },
                  ].map(({ label, key }, i) => (
                    <TableCell
                      key={i}
                      align="center"
                      sx={{
                        color: "#fff",
                        fontWeight: "bold",
                        cursor: key ? "pointer" : "default",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {key ? (
                        <TableSortLabel
                          active={orderBy === key}
                          direction={orderBy === key ? order : "asc"}
                          onClick={() => handleSort(key)}
                          sx={{
                            color: "#fff",
                            "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                          }}
                        >
                          {label}
                        </TableSortLabel>
                      ) : label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Không có dữ liệu điểm danh ngày này.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell className="hoten">{row.hoTen || "—"}</TableCell>
                      <TableCell align="center">{row.lop || "—"}</TableCell>
                      <TableCell align="center">
                        {row.loai?.toUpperCase() === "P" ? "✅" : "❌"}
                      </TableCell>
                      <TableCell align="center">
                        {row.lydo?.trim() ? row.lydo : "Không rõ lý do"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
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
