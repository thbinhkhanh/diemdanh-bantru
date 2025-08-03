import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, Button,
  TableSortLabel, TableContainer,
  InputLabel, FormControl, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { db } from "./firebase";
import { format } from "date-fns";
import { useMediaQuery, useTheme } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { LinearProgress } from "@mui/material";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";


export default function NhatKyGV() {
  const location = useLocation();
  const navigate = useNavigate();
  const lop = location.state?.lop;

  const today = new Date();
  const [filterMode, setFilterMode] = useState("thang");
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterThang, setFilterThang] = useState(today.getMonth() + 1);
  const [filterNam, setFilterNam] = useState(today.getFullYear());
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderBy, setOrderBy] = useState("hoVaTen");
  const [order, setOrder] = useState("asc");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (filterMode === "ngay") {
      const currentDay = selectedDate.getDate();
      const maxDays = new Date(filterNam, filterThang, 0).getDate();
      const safeDay = Math.min(currentDay, maxDays);
      const newDate = new Date(filterNam, filterThang - 1, safeDay);
      setSelectedDate(newDate);
    }
  }, [filterThang, filterNam, filterMode]);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      // 🔍 Lấy năm học hiện tại
      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

      if (!namHocValue) {
        console.error("❌ Không tìm thấy năm học hiện tại!");
        setDataList([]);
        return;
      }

      const collectionName = `DIEMDANH_${namHocValue}`;
      const thang = selectedDate.getMonth() + 1;
      const nam = selectedDate.getFullYear();
      const ngayKey = format(selectedDate, "yyyy-MM-dd");
      const thangKey = `${nam}-${String(thang).padStart(2, "0")}`;

      const snapshot = await getDocs(collection(db, collectionName));
      const allData = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lop === lop) {
          allData.push({ id: docSnap.id, ...data });
        }
      });

      const filterByNgay = (data) =>
        data.filter((entry) => format(new Date(entry.ngay), "yyyy-MM-dd") === ngayKey);

      const filtered = filterMode === "ngay"
        ? filterByNgay(allData).filter((d) => d.thang === thangKey)
        : allData.filter((d) => d.thang === thangKey);

      setDataList(filtered);
    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lop) {
      //console.log('🔁 useEffect gọi fetchData vì thay đổi:', {
      //  filterMode, selectedDate, filterThang, filterNam, lop
      //});
      fetchData();
    }
  }, [filterMode, selectedDate, filterThang, filterNam, lop]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortByName = (a, b) => {
    const splitA = a.hoVaTen?.trim().split(/\s+/) || [];
    const splitB = b.hoVaTen?.trim().split(/\s+/) || [];
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

  const filteredData = lop ? dataList.filter((item) => item.lop === lop) : [];

  const sortedData = [...filteredData].sort((a, b) => {
    const dateA = new Date(a.ngay || 0);
    const dateB = new Date(b.ngay || 0);

    // So sánh ngày
    if (dateA.getTime() !== dateB.getTime()) {
      return order === "asc" ? dateA - dateB : dateB - dateA;
    }

    // Nếu ngày giống nhau, so sánh tên
    return sortByName(a, b);
  });

  if (!lop) {
    return (
      <Box sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h6" color="error">
          ❗ Không tìm thấy thông tin lớp được chọn.
        </Typography>
        <Button variant="contained" color="secondary" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          ⬅️ Quay lại
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#e3f2fd', minHeight: '100vh', py: 3 }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: "750px",
          mx: "auto",
          px: { xs: 1, sm: 2 },
          //pt: 2,
        }}
      >
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2, mt: 0 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            align="center"
            color="primary"
            sx={{ mb: 4, borderBottom: "3px solid #1976d2", pb: 1 }}
          >
            NHẬT KÝ ĐIỂM DANH - LỚP {lop}
          </Typography>

          {/* Bộ lọc ngày/tháng */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
              >
                <FormControlLabel value="ngay" control={<Radio />} label="Ngày" />
                <FormControlLabel value="thang" control={<Radio />} label="Tháng" />
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
              }}
            >
              {filterMode === "ngay" && (
                <DatePicker
                  label="Chọn ngày"
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  slotProps={{ textField: { size: "small", sx: { width: 140 } } }}
                />
              )}

              {filterMode === "thang" && (
                <DatePicker
                  label="Chọn tháng"
                  views={["year", "month"]}
                  value={new Date(filterNam, filterThang - 1)}
                  onChange={(newDate) => {
                    if (newDate) {
                      setFilterNam(newDate.getFullYear());
                      setFilterThang(newDate.getMonth() + 1);
                    }
                  }}
                  format="M/yyyy"
                  slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
                />
              )}
            </Box>
          </LocalizationProvider>

          {/* Hiển thị dữ liệu */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Box sx={{ width: '50%' }}>
                <LinearProgress />
              </Box>
            </Box>
          ) : isMobile ? (
            // 💡 Dạng thẻ cho mobile
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sortedData.length === 0 ? (
                <Typography sx={{ textAlign: "center", fontStyle: "italic" }}>
                  Không có dữ liệu phù hợp
                </Typography>
              ) : (
                sortedData.map((item, index) => (
                  <Paper key={item.id || index} sx={{ p: 2, borderLeft: '5px solid #1976d2' }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                      {index + 1}. {item.hoVaTen?.toUpperCase()}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Có phép:</strong>{" "}
                      {item.phep === true ? "✅" : "❌"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Lý do nghỉ:</strong> {item.lyDo?.trim() || "Không rõ lý do"}
                    </Typography>
                    <Typography variant="body2" color="error">
                      <strong>Ngày nghỉ:</strong>{" "}
                      {item.ngay
                        ? new Date(item.ngay).toLocaleDateString("vi-VN")
                        : "Không rõ"}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>
          ) : (
            // 💻 Dạng bảng cho desktop
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
                  "& td.hoVaTen": {
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#1976d2" }}>
                    {["STT", "HỌ VÀ TÊN", "CÓ PHÉP", "LÝ DO", "NGÀY NGHỈ"].map((label, i) => (
                      <TableCell
                        key={i}
                        align="center"
                        sx={{
                          color: "#fff",
                          fontWeight: "bold",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ fontStyle: "italic", textAlign: "center" }}>
                        Không có dữ liệu phù hợp
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="hoVaTen">{item.hoVaTen || ""}</TableCell>
                        <TableCell>
                          {item.phep === true ? "✅" : "❌"}
                        </TableCell>
                        <TableCell>{item.lyDo?.trim() || "Không rõ lý do"}</TableCell>
                        <TableCell>
                          {item.ngay
                            ? new Date(item.ngay).toLocaleDateString("vi-VN")
                            : "Không rõ"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Nút quay lại */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Button
              onClick={() => {
                const selectedClass = location.state?.lop;
                const selectedLop = selectedClass?.split('.')[0]; // Tách lấy "1" từ "1.5"
                if (selectedLop) {
                  navigate(`/lop${selectedLop}`, { state: { lop: selectedClass } });
                } else {
                  navigate('/home'); // fallback nếu không có thông tin lớp
                }
              }}
              color="secondary"
            >
              ⬅️ Quay lại
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );

}
