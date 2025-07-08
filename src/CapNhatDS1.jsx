import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, Stack, FormControl, InputLabel,
  Select, MenuItem, TextField, Button, LinearProgress,
  RadioGroup, FormControlLabel, Radio, Alert
} from "@mui/material";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MySort } from './utils/MySort';

export default function CapNhatDS({ onBack }) {
  const [classList, setClassList] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentData, setSelectedStudentData] = useState(null);
  const [dangKy, setDangKy] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nhapTuDanhSach, setNhapTuDanhSach] = useState("danhSach");
  const [namHocValue, setNamHocValue] = useState(null);

  const [customHoTen, setCustomHoTen] = useState("");
  const [customMaDinhDanh, setCustomMaDinhDanh] = useState("");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const dangKyOptions = ["Đăng ký mới", "Hủy đăng ký", "Đăng ký lại"];

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHoc = namHocDoc.exists() ? namHocDoc.data().value : null;
        if (!namHoc) {
          setLoading(false);
          showSnackbar("❌ Không tìm thấy năm học hợp lệ trong hệ thống!", "error");
          return;
        }
        setNamHocValue(namHoc);

        const snapshot = await getDocs(collection(db, `BANTRU_${namHoc}`));
        const studentsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setAllStudents(studentsData);
        const classes = Array.from(new Set(studentsData.map((s) => s.lop))).sort();
        setClassList(classes);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        showSnackbar("Lỗi tải dữ liệu học sinh!", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setFilteredStudents([]);
      setSelectedStudentId("");
      setSelectedStudentData(null);
      setDangKy("");
      if (snackbar.open) setSnackbar({ ...snackbar, open: false });
      return;
    }
    const filtered = MySort(allStudents.filter((s) => s.lop === selectedClass));
    setFilteredStudents(filtered);
    setSelectedStudentId("");
    setSelectedStudentData(null);
    setDangKy("");
    if (snackbar.open) setSnackbar({ ...snackbar, open: false });
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedStudentId || nhapTuDanhSach !== "danhSach") {
      setSelectedStudentData(null);
      setDangKy("");
      if (snackbar.open) setSnackbar({ ...snackbar, open: false });
      return;
    }
    const student = filteredStudents.find((s) => s.id === selectedStudentId);
    setSelectedStudentData(student || null);
    setDangKy(student?.dangKy || "");
    if (snackbar.open) setSnackbar({ ...snackbar, open: false });
  }, [selectedStudentId, filteredStudents, nhapTuDanhSach]);

  const handleUpdate = async () => {
    const loginRole = localStorage.getItem("loginRole");
    if (loginRole !== "admin" && loginRole !== "bgh") {
      showSnackbar("❌ Bạn không có quyền cập nhật danh sách!", "error");
      return;
    }

    if (!namHocValue) {
      showSnackbar("❌ Không tìm thấy năm học để cập nhật!", "error");
      return;
    }

    setSaving(true);

    if (!selectedClass) {
      showSnackbar("⚠️ Vui lòng chọn lớp!", "warning");
      setSaving(false);
      return;
    }

    if (nhapTuDanhSach === "danhSach") {
      if (!selectedStudentId || !selectedStudentData) {
        showSnackbar("⚠️ Vui lòng chọn học sinh!", "warning");
        setSaving(false);
        return;
      }
    } else {
      if (!customHoTen.trim() || !customMaDinhDanh.trim()) {
        showSnackbar("⚠️ Vui lòng nhập đầy đủ họ tên và mã định danh!", "warning");
        setSaving(false);
        return;
      }
    }

    if (!dangKy) {
      showSnackbar("⚠️ Vui lòng chọn trạng thái đăng ký!", "warning");
      setSaving(false);
      return;
    }

    try {
      const huyDangKy = dangKy === "Hủy đăng ký" ? "x" : "T";

      if (nhapTuDanhSach === "danhSach") {
        const currentStatus = selectedStudentData.huyDangKy || "";

        if (
          (dangKy === "Hủy đăng ký" && currentStatus === "x") ||
          (dangKy === "Đăng ký mới" && currentStatus === "T")
        ) {
          showSnackbar("⚠️ Trạng thái đăng ký không thay đổi", "info");
          setSaving(false);
          return;
        }

        await updateDoc(doc(db, `BANTRU_${namHocValue}`, selectedStudentData.id), {
          huyDangKy,
        });

        showSnackbar("✅ Cập nhật thành công!");
      } else {
        const maDinhDanh = customMaDinhDanh.trim();
        const docRef = doc(db, `BANTRU_${namHocValue}`, maDinhDanh);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          const newSTT = allStudents.length + 1;
          await setDoc(docRef, {
            stt: newSTT,
            hoVaTen: customHoTen.trim(),
            lop: selectedClass,
            huyDangKy,
          });
          showSnackbar("✅ Thêm học sinh mới thành công!");
        } else {
          await updateDoc(docRef, { huyDangKy });
          showSnackbar("✅ Cập nhật học sinh thành công!");
        }
      }
    } catch (error) {
      console.error("❌ Lỗi cập nhật:", error);
      showSnackbar("❌ Cập nhật thất bại!", "error");
    } finally {
      setSaving(false);
    }
  };



  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "transparent", // 👈 Màu nền trong suốt
        pt: 1,
        px: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >

      <Box maxWidth={420} width="100%">
        <Card elevation={10} sx={{ p: 4, mt: 1, borderRadius: 4, backgroundColor: "white" }}>
          {/* Tiêu đề và đường gạch xanh với khoảng cách giống các component khác */}
          <Box sx={{ mb: 5 }}>
            <Typography variant="h5" align="center" fontWeight="bold" color="primary" gutterBottom>
              CẬP NHẬT DANH SÁCH
            </Typography>
            <Box sx={{ height: "2.5px", width: "100%", backgroundColor: "#1976d2", borderRadius: 1, mt: 2, mb: 4 }} />
          </Box>

          {loading ? (
            <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", my: 2 }}>
              <Box sx={{ width: "60%" }}><LinearProgress /></Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Đang tải dữ liệu học sinh...</Typography>
            </Box>
          ) : (
            <>
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
                  <RadioGroup row value={nhapTuDanhSach} onChange={(e) => { setNhapTuDanhSach(e.target.value); if (snackbar.open) setSnackbar({ ...snackbar, open: false }); }}>
                    <FormControlLabel value="danhSach" control={<Radio size="small" />} label="Chọn từ danh sách" />
                    <FormControlLabel value="thuCong" control={<Radio size="small" />} label="Nhập thủ công" />
                  </RadioGroup>
                </Box>
              </FormControl>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel id="label-lop">Lớp</InputLabel>
                <Select
                  labelId="label-lop"
                  value={selectedClass}
                  label="Lớp"
                  onChange={(e) => { setSelectedClass(e.target.value); if (snackbar.open) setSnackbar({ ...snackbar, open: false }); }}
                >
                  <MenuItem value=""><em>Chọn lớp</em></MenuItem>
                  {classList.map((cls) => (
                    <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {nhapTuDanhSach === "danhSach" ? (
                <>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Học sinh</InputLabel>
                    <Select
                      value={selectedStudentId}
                      label="Học sinh"
                      onChange={(e) => { setSelectedStudentId(e.target.value); if (snackbar.open) setSnackbar({ ...snackbar, open: false }); }}
                      disabled={!selectedClass}
                    >
                      <MenuItem value=""><em>Chọn học sinh</em></MenuItem>
                      {filteredStudents.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          <Typography sx={{ color: s.huyDangKy !== 'x' ? '#1976d2' : 'inherit' }}>
                            {s.hoVaTen}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField label="Mã định danh" size="small" fullWidth value={selectedStudentData?.id || ""} InputProps={{ readOnly: true }} disabled sx={{ mb: 2 }} />
                </>
              ) : (
                <>
                  <TextField label="Họ và tên" size="small" fullWidth value={customHoTen} onChange={(e) => { setCustomHoTen(e.target.value); if (snackbar.open) setSnackbar({ ...snackbar, open: false }); }} sx={{ mb: 2 }} />
                  <TextField label="Mã định danh" size="small" fullWidth value={customMaDinhDanh} onChange={(e) => { setCustomMaDinhDanh(e.target.value); if (snackbar.open) setSnackbar({ ...snackbar, open: false }); }} sx={{ mb: 2 }} />
                </>
              )}

              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel>Trạng thái đăng ký</InputLabel>
                <Select
                  value={dangKy}
                  label="Trạng thái đăng ký"
                  onChange={(e) => { setDangKy(e.target.value); if (snackbar.open) setSnackbar({ ...snackbar, open: false }); }}
                  disabled={nhapTuDanhSach === "danhSach" ? !selectedStudentData : false}
                >
                  <MenuItem value=""><em>Chọn trạng thái</em></MenuItem>
                  {dangKyOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdate}
                  disabled={saving}
                  sx={{ width: 160, fontWeight: 600, py: 1 }}
                >
                  {saving ? "🔄 Cập nhật" : "Cập nhật"}
                </Button>

                {snackbar.open && (
                  <Alert
                    severity={snackbar.severity}
                    sx={{
                      width: '92%',
                      fontWeight: 500,
                      borderRadius: 2,
                      mt: 2
                    }}
                  >
                    {snackbar.message}
                  </Alert>
                )}

                <Button onClick={onBack} color="secondary">
                  ⬅️ Quay lại
                </Button>
              </Stack>
            </>
          )}
        </Card>
      </Box>
    </Box>
  );
}
