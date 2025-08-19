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
import UpdateIcon from "@mui/icons-material/Update";

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
  //const [customMaDinhDanh, setCustomMaDinhDanh] = useState("");
  const { getClassList, setClassListForKhoi } = useClassList();
  const { getClassData, setClassData } = useClassData();
  const [fetchedClasses, setFetchedClasses] = useState({});
  

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const dangKyOptions = ["Đăng ký", "Hủy đăng ký"];
  const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

  const isDangKyDisabled = nhapTuDanhSach === "thuCong" || (nhapTuDanhSach === "danhSach" && !selectedStudentId);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchStudents = async (selectedClass, namHoc) => {
    try {
      const cacheKey = selectedClass;
      const cachedData = getClassData?.(cacheKey);
      const isFetched = fetchedClasses?.[cacheKey];
      const shouldFetch = !Array.isArray(cachedData) || cachedData.length === 0;

      let finalStudents = [];

      if (!shouldFetch || isFetched) {
        //console.log(`📦 Dữ liệu lớp ${cacheKey} lấy từ context hoặc đã cached.`);
        finalStudents = cachedData;
      } else {
        //console.log(`🌐 Dữ liệu lớp ${cacheKey} đang được lấy từ Firestore...`);
        const docRef = doc(db, `DANHSACH_${namHoc}`, selectedClass);
        const docSnap = await getDoc(docRef);
        const danhSachData = [];

        if (docSnap.exists()) {
          const data = docSnap.data();
          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(hs => {
                if (hs && typeof hs === "object") {
                  danhSachData.push({
                    ...hs,
                    id: hs.maDinhDanh || hs.id || `missing-${Math.random().toString(36).slice(2)}`,
                    lop: selectedClass
                  });
                }
              });
            }
          });
        }

        const selectedDateStr = new Date().toISOString().split("T")[0];
        const enriched = enrichStudents(danhSachData, selectedDateStr, selectedClass);
        finalStudents = enriched.map((s, index) => ({ ...s, stt: index + 1 }));

        setClassData?.(cacheKey, finalStudents);
        setFetchedClasses?.(prev => ({ ...prev, [cacheKey]: true }));
      }

      setAllStudents(finalStudents);
      setFilteredStudents(MySort(finalStudents));
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

      const getNgayVN = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mi = String(now.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
      };

      const classRef = doc(db, `DANHSACH_${namHocValue}`, selectedClass);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) {
        showSnackbar("❌ Không tìm thấy dữ liệu lớp!", "error");
        setSaving(false);
        return;
      }

      const classDataRaw = classSnap.data();
      const updatedFields = {};
      let found = false;

      // ✅ Trường hợp cập nhật học sinh đã có
      if (nhapTuDanhSach === "danhSach") {
        Object.entries(classDataRaw).forEach(([fieldKey, fieldValue]) => {
          if (Array.isArray(fieldValue)) {
            const updatedArray = fieldValue.map((hs) => {
              if (hs.maDinhDanh === selectedStudentData.maDinhDanh) {
                found = true;
                return { ...hs, dangKyBanTru, diemDanhBanTru };
              }
              return hs;
            });
            updatedFields[fieldKey] = updatedArray;
          }
        });

        if (!found) {
          showSnackbar("⚠️ Không tìm thấy học sinh trong dữ liệu lớp!", "warning");
          setSaving(false);
          return;
        }

        await updateDoc(classRef, updatedFields);
        showSnackbar("✅ Cập nhật thành công!");

        const timestampNow = Date.now();
        const logId = `${getNgayVN().split(" ")[0]}_${selectedStudentData.maDinhDanh}-${timestampNow}-0`;

        await setDoc(doc(db, `NHATKYBANTRU_${namHocValue}`, logId), {
          maDinhDanh: selectedStudentData.maDinhDanh,
          hoVaTen: selectedStudentData.hoVaTen || "",
          lop: selectedClass, // dùng lớp cố định để đồng bộ
          trangThai: dangKy,
          ngayDieuChinh: getNgayVN(),
        });
      }

      // ✅ Trường hợp thêm học sinh mới
      else {
        const danhSachField = "danhSach_1"; // hoặc tự động xác định theo điều kiện riêng
        const currentList = Array.isArray(classDataRaw[danhSachField]) ? classDataRaw[danhSachField] : [];
        const newMaDinhDanh = `${selectedClass}-${nanoid()}`;

        const newStudent = {
          maDinhDanh: newMaDinhDanh,
          hoVaTen: customHoTen.trim(),
          lop: selectedClass,
          dangKyBanTru,
          diemDanhBanTru,
          stt: currentList.length + 1,
        };

        const updatedList = [...currentList, newStudent];
        await updateDoc(classRef, { [danhSachField]: updatedList });
        showSnackbar("✅ Thêm học sinh mới thành công!");

        const timestamp = Date.now();
        const logId = `${selectedClass}-${newMaDinhDanh.slice(-7)}-${timestamp}`;
        await setDoc(doc(db, `NHATKYBANTRU_${namHocValue}`, logId), {
          maDinhDanh: newMaDinhDanh,
          hoVaTen: customHoTen.trim(),
          lop: selectedClass,
          trangThai: dangKy,
          ngayDieuChinh: getNgayVN(),
        });
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

              <FormControl fullWidth size="small" sx={{ mb: 3 }} disabled={isDangKyDisabled}>
                <InputLabel>Trạng thái đăng ký</InputLabel>
                <Select
                  value={dangKy}
                  label="Trạng thái đăng ký"
                  onChange={(e) => { setDangKy(e.target.value); }}
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
                  startIcon={<UpdateIcon />}
                  sx={{ width: 160, fontWeight: 600, py: 1, whiteSpace: "nowrap" }}
                >
                  {saving ? "Đang cập nhật..." : "Cập nhật"}
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
