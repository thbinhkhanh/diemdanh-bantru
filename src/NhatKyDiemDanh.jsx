import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, CircularProgress, Stack, Button,
  TableSortLabel, TableContainer, Select, MenuItem,
  InputLabel, FormControl, RadioGroup, FormControlLabel, Radio
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

  // Chế độ lọc: "ngay", "thang", "nam"
  const [filterMode, setFilterMode] = useState("ngay");

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

  // Đồng bộ selectedDate khi đổi tháng hoặc năm (dùng cho filterMode != "ngay" để tránh ngày vượt quá tháng)
  useEffect(() => {
  if (filterMode === "ngay") {
    const currentDay = selectedDate.getDate();
    const maxDays = new Date(filterNam, filterThang, 0).getDate();
    const safeDay = Math.min(currentDay, maxDays);
    const newDate = new Date(filterNam, filterThang - 1, safeDay);
    setSelectedDate(newDate);
  }
}, [filterThang, filterNam, filterMode]);


  // Hàm lấy dữ liệu theo filterMode
    const fetchData = async () => {
    setIsLoading(true);
    try {
      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

      if (!namHocValue) {
        console.error("❌ Không tìm thấy năm học hiện tại!");
        setDataList([]);
        setDanhSachLop([]);
        setIsLoading(false);
        return;
      }

      let combinedData = [];

      if (filterMode === "ngay") {
        const ngayKey = format(selectedDate, "yyyy-MM-dd");
        const nhatKyDoc = await getDoc(doc(db, `NHATKY_${namHocValue}`, ngayKey));
        if (nhatKyDoc.exists()) {
          const rawData = nhatKyDoc.data();
          combinedData = Object.entries(rawData).map(([id, value]) => ({ id, ...value }));
        }
      } else {
        // Tháng hoặc năm
        const datesToFetch = [];

        if (filterMode === "thang") {
          const year = filterNam;
          const month = filterThang - 1;
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          for (let day = 1; day <= daysInMonth; day++) {
            datesToFetch.push(new Date(year, month, day));
          }
        }

        if (filterMode === "nam") {
          const year = filterNam;
          for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
              datesToFetch.push(new Date(year, month, day));
            }
          }
        }

        // Dùng Promise.all để load song song
        const promises = datesToFetch.map((date) => {
          const ngayKey = format(date, "yyyy-MM-dd");
          const docRef = doc(db, `NHATKY_${namHocValue}`, ngayKey);
          return getDoc(docRef).then((snapshot) => ({ snapshot, ngayKey }));
        });

        const results = await Promise.all(promises);

        for (const { snapshot } of results) {
          if (snapshot.exists()) {
            const rawData = snapshot.data();
            combinedData = combinedData.concat(
              Object.entries(rawData).map(([id, value]) => ({ id, ...value }))
            );
          }
        }
      }

      setDataList(combinedData);

      const uniqueLop = [...new Set(combinedData.map(item => item.lop).filter(Boolean))];
      uniqueLop.sort((a, b) => {
        const [numA] = a.match(/^(\d+)/) || [""];
        const [numB] = b.match(/^(\d+)/) || [""];
        return +numA - +numB;
      });
      setDanhSachLop(["Tất cả", ...uniqueLop]);
    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      setDataList([]);
      setDanhSachLop([]);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [filterMode, selectedDate, filterThang, filterNam]);

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

  // Lọc dữ liệu theo Khối và Lớp
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
      setFilterLop("Tất cả");
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
          sx={{ mb: 4, borderBottom: '3px solid #1976d2', pb: 1 }}
        >
          NHẬT KÝ ĐIỂM DANH
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <FormControlLabel value="ngay" control={<Radio />} label="Ngày" />
              <FormControlLabel value="thang" control={<Radio />} label="Tháng" />
              <FormControlLabel value="nam" control={<Radio />} label="Năm" />
            </RadioGroup>
          </FormControl>
        </Box>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              flexDirection: { xs: "column", sm: "row" }, // xs = mobile, sm = tablet+
            }}
          >

            {filterMode === "ngay" && (
              <DatePicker
                label="Chọn ngày"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: { width: 140 },
                  },
                }}
              />
            )}

            {filterMode === "thang" && (
              <>
                <FormControl size="small" sx={{ minWidth: 110, width: 110 }}>
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

                <FormControl size="small" sx={{ minWidth: 90, width: 90 }}>
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
              </>
            )}

            {filterMode === "nam" && (
              <FormControl size="small" sx={{ minWidth: 100, width: 100 }}>
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
            )}

            {/* Gộp thêm dropdown Khối và Lớp ở đây */}
            <FormControl size="small" sx={{ minWidth: 100, width: 100 }}>
              <InputLabel>Khối</InputLabel>
              <Select value={filterKhoi} label="Khối" onChange={(e) => handleKhoiChange(e.target.value)}>
                {danhSachKhoi.map((k) => (
                  <MenuItem key={k} value={k}>{k}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100, width: 100 }}>
              <InputLabel>Lớp</InputLabel>
              <Select value={filterLop} label="Lớp" onChange={(e) => handleLopChange(e.target.value)}>
                {danhSachLop.map((l) => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </LocalizationProvider>

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
                      ) : (
                        label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ fontStyle: "italic" }}>
                      Không có dữ liệu phù hợp
                    </TableCell>
                  </TableRow>
                )}
                {sortedData.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="hoten">{item.hoTen || ""}</TableCell>
                    <TableCell>{item.lop || ""}</TableCell>
                    <TableCell>
                      {item.loai?.trim().toUpperCase() === "P" ? "✅" : "❌"}
                    </TableCell>

                    <TableCell>{item.lydo?.trim() ? item.lydo : "Không rõ lý do"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button onClick={onBack} color="secondary">
            ⬅️ Quay lại
          </Button>

        </Box>
      </Paper>
    </Box>
  );
}
