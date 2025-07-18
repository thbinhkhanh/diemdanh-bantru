import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, Stack, FormControl, InputLabel,
  Select, MenuItem, TextField, Button, LinearProgress,
  RadioGroup, FormControlLabel, Radio, Alert
} from "@mui/material";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MySort } from './utils/MySort';
import { customAlphabet } from 'nanoid';
import { useClassList } from "./context/ClassListContext";
import { useClassData } from "./context/ClassDataContext";
import { query, where } from "firebase/firestore";
import { enrichStudents } from "./pages/ThanhPhan/enrichStudents";

export default function CapNhatDS({ onBack }) {
  const [classList, setClassList] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentData, setSelectedStudentData] = useState(null);
  const [dangKy, setDangKy] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nhapTuDanhSach, setNhapTuDanhSach] = useState("danhSach");
  const [namHocValue, setNamHocValue] = useState(null);

  const [customHoTen, setCustomHoTen] = useState("");
  const [customMaDinhDanh, setCustomMaDinhDanh] = useState("");
  const { getClassList, setClassListForKhoi } = useClassList();
  const { getClassData, setClassData } = useClassData();

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const dangKyOptions = ["Đăng ký", "Hủy đăng ký"];
  const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchStudents = async (selectedClass, namHoc) => {
    try {
      //console.log("🚀 Bắt đầu fetchStudents cho lớp:", selectedClass, "| Năm học:", namHoc);

      const cacheKey = selectedClass; 
      let cachedData = getClassData(cacheKey);

      if (!cachedData || cachedData.length === 0) {
        //console.log("🔥 [STUDENT LIST] Không có cache, tải từ Firestore");
        const q = query(collection(db, `DANHSACH_${namHoc}`), where("lop", "==", selectedClass));
        const snapshot = await getDocs(q);
        const rawStudents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        //console.log(`✅ Lấy được ${rawStudents.length} học sinh từ Firestore cho lớp ${selectedClass}`);

        // ✅ enrich dữ liệu (giả sử enrichStudents tồn tại)
        const selectedDateStr = new Date().toISOString().split("T")[0]; // hoặc truyền ngày cụ thể bạn cần
        const enriched = enrichStudents(rawStudents, selectedDateStr, selectedClass);

        // ✅ Gắn stt
        const enrichedWithRegister = enriched.map((s, index) => ({
          ...s,
          stt: index + 1
        }));

        setClassData(cacheKey, enrichedWithRegister); // ✅ Lưu vào context
        setAllStudents(enrichedWithRegister);
        setFilteredStudents(MySort(enrichedWithRegister));

      } else {
        //console.log("📦 [STUDENT LIST] Lấy từ context:", cachedData.length, "học sinh");
        setAllStudents(cachedData);
        setFilteredStudents(MySort(cachedData));
      }

      setLoading(false);
    } catch (error) {
      console.error("❌ Lỗi khi tải danh sách học sinh:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchClassListAndStudents = async () => {
      try {
        //console.log("🚀 useEffect chạy - bắt đầu lấy dữ liệu");

        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHoc = namHocDoc.exists() ? namHocDoc.data().value : null;

        if (!namHoc) {
          console.error("❌ Không tìm thấy năm học hợp lệ trong hệ thống!");
          setLoading(false);
          return;
        }

        //console.log("📅 Năm học hiện tại:", namHoc);
        setNamHocValue(namHoc);

        // === LẤY DANH SÁCH LỚP ===
        let cachedClassList = getClassList("TRUONG");
        if (!cachedClassList || cachedClassList.length === 0) {
          //console.log("🔥 [CLASSLIST] Lấy từ Firestore");
          const classDoc = await getDoc(doc(db, `CLASSLIST_${namHoc}`, "TRUONG"));
          cachedClassList = classDoc.exists() ? classDoc.data().list || [] : [];

          if (cachedClassList.length > 0) {
            //console.log("✅ Lấy thành công danh sách lớp từ Firestore:", cachedClassList);
            setClassListForKhoi("TRUONG", cachedClassList);
          } else {
            console.warn(`⚠️ Không tìm thấy CLASSLIST_${namHoc}/TRUONG hoặc không có dữ liệu`);
          }
        } else {
          //console.log("📦 [CLASSLIST] Lấy từ context:", cachedClassList);
        }

        setClassList(cachedClassList);

        if (cachedClassList.length > 0) {
          const firstClass = cachedClassList[0];
          //console.log("🎯 Chọn lớp đầu tiên:", firstClass);
          setSelectedClass(firstClass);
          await fetchStudents(firstClass, namHoc);
        } else {
          console.warn("⚠️ Không có lớp nào để chọn");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Lỗi khi tải danh sách lớp và học sinh:", error);
        setLoading(false);
      }
    };

    fetchClassListAndStudents();
  }, []);


  const fetchStudentsForClass = async (lop) => {
    if (!namHocValue || !lop) return;
    setLoading(true);
    await fetchStudents(lop, namHocValue);

    // ✅ Nếu đang ở chế độ nhập thủ công, set mặc định "Đăng ký"
    if (nhapTuDanhSach === "thuCong") {
      //setDangKy("Đăng ký");
    }
  };

  useEffect(() => {
    if (!selectedClass) {
      setFilteredStudents([]);
      setSelectedStudentId("");
      setSelectedStudentData(null);
      //setDangKy("");
      //if (snackbar.open) setSnackbar({ ...snackbar, open: false });
      return;
    }
    setSelectedStudentId("");
    setSelectedStudentData(null);
    //setDangKy("");
    //if (snackbar.open) setSnackbar({ ...snackbar, open: false });
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedStudentId || nhapTuDanhSach !== "danhSach") {
      setSelectedStudentData(null);
      //setDangKy("");
      return;
    }

    const student = filteredStudents.find((s) => s.id === selectedStudentId);
    setSelectedStudentData(student || null);

    if (student) {
      // Cập nhật trạng thái đăng ký dựa trên dangKyBanTru
      setDangKy(student.dangKyBanTru ? "Hủy đăng ký" : "Đăng ký");
    } else {
      //setDangKy("");
    }
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
      if (!customHoTen.trim()) {
        showSnackbar("⚠️ Vui lòng nhập họ tên!", "warning");
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
      const dangKyBanTru = dangKy === "Hủy đăng ký" ? false : true;
      const diemDanhBanTru = dangKyBanTru;

      if (nhapTuDanhSach === "danhSach") {
        const currentStatus = selectedStudentData.dangKyBanTru;

        if (
          (dangKy === "Hủy đăng ký" && currentStatus === false) ||
          (dangKy === "Đăng ký mới" && currentStatus === true)
        ) {
          showSnackbar("⚠️ Trạng thái đăng ký không thay đổi", "info");
          setSaving(false);
          return;
        }

        await updateDoc(doc(db, `DANHSACH_${namHocValue}`, selectedStudentData.id), {
          dangKyBanTru,
          diemDanhBanTru
        });

        const updatedStudents = allStudents.map((s) =>
          s.id === selectedStudentData.id ? { ...s, dangKyBanTru, diemDanhBanTru } : s
        );

        setClassData(selectedClass, updatedStudents);
        setAllStudents(updatedStudents);
        setFilteredStudents(MySort(updatedStudents));

        showSnackbar("✅ Cập nhật thành công!");
      } else {
        const generatedMaDinhDanh = `${selectedClass}-${nanoid()}`;
        const docRef = doc(db, `DANHSACH_${namHocValue}`, generatedMaDinhDanh);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          const newSTT = allStudents.length + 1;
          await setDoc(docRef, {
            stt: newSTT,
            hoVaTen: customHoTen.trim(),
            lop: selectedClass,
            dangKyBanTru,
            diemDanhBanTru,
          });

          const newStudent = {
            id: generatedMaDinhDanh,
            stt: newSTT,
            hoVaTen: customHoTen.trim(),
            lop: selectedClass,
            dangKyBanTru,
            diemDanhBanTru,
          };

          const updated = [...allStudents, newStudent];
          setClassData(selectedClass, updated);
          setAllStudents(updated);
          setFilteredStudents(MySort(updated));

          showSnackbar("✅ Thêm học sinh mới thành công!");
        } else {
          await updateDoc(docRef, {
            dangKyBanTru,
            diemDanhBanTru
          });

          const updatedStudents = allStudents.map((s) =>
            s.id === generatedMaDinhDanh ? { ...s, dangKyBanTru, diemDanhBanTru } : s
          );

          setClassData(selectedClass, updatedStudents);
          setAllStudents(updatedStudents);
          setFilteredStudents(MySort(updatedStudents));

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
    <Box sx={{ minHeight: "100vh", backgroundColor: "transparent", pt: 1, px: 1, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <Box maxWidth={420} width="100%">
        <Card elevation={10} sx={{ p: 4, mt: 1, borderRadius: 4, backgroundColor: "white" }}>
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
                  <RadioGroup
                    row
                    value={nhapTuDanhSach}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNhapTuDanhSach(value);
                      if (value === "thuCong") {
                        setDangKy("Đăng ký");
                      } else {
                        setDangKy("");
                      }
                    }}
                  >
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
                  onChange={(e) => {
                    const newClass = e.target.value;
                    setSelectedClass(newClass);
                    fetchStudentsForClass(newClass);
                    //if (snackbar.open) setSnackbar({ ...snackbar, open: false });
                  }}
                >
                  <MenuItem value=""><em>Chọn lớp</em></MenuItem>
                  {classList.map((cls) => (
                    <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {nhapTuDanhSach === "danhSach" ? (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Học sinh</InputLabel>
                  <Select
                    value={selectedStudentId}
                    label="Học sinh"
                    onChange={(e) => { setSelectedStudentId(e.target.value);  }}
                    disabled={!selectedClass}
                  >
                    <MenuItem value=""><em>Chọn học sinh</em></MenuItem>
                    {filteredStudents.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        <Typography sx={{ color: s.dangKyBanTru ? '#1976d2' : 'inherit' }}>
                        {s.hoVaTen}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField label="Họ và tên" size="small" fullWidth value={customHoTen} onChange={(e) => { setCustomHoTen(e.target.value);  }} sx={{ mb: 2 }} />
              )}

              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel>Trạng thái đăng ký</InputLabel>
                <Select
                  value={dangKy}
                  label="Trạng thái đăng ký"
                  onChange={(e) => { setDangKy(e.target.value); }}
                  disabled={true} // 🔒 Luôn vô hiệu hóa
                >
                  <MenuItem value=""><em>Chọn trạng thái</em></MenuItem>
                  {dangKyOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>


              <Stack spacing={2} alignItems="center">
                <Button variant="contained" color="primary" onClick={handleUpdate} disabled={saving} sx={{ width: 160, fontWeight: 600, py: 1 }}>
                  {saving ? "🔄 Cập nhật" : "Cập nhật"}
                </Button>

                {snackbar.open && (
                  <Alert severity={snackbar.severity} sx={{ width: '92%', fontWeight: 500, borderRadius: 2, mt: 2 }}>
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
