import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, Stack, FormControl, InputLabel,
  Select, MenuItem, TextField, Button, LinearProgress,
  RadioGroup, FormControlLabel, Radio, Alert, IconButton
} from "@mui/material";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MySort } from './utils/MySort';
import { customAlphabet } from 'nanoid';
import { useClassList } from "./context/ClassListContext";
import { useClassData } from "./context/ClassDataContext";
import { query, where } from "firebase/firestore";
import { enrichStudents } from "./pages/ThanhPhan/enrichStudents";
import UpdateIcon from '@mui/icons-material/Update';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Tooltip from "@mui/material/Tooltip";

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

  // state cho thêm học sinh
  const [isAdding, setIsAdding] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");

  // state cho sửa học sinh
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");


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

  // Đặt hàm này ở ngoài cùng, ngay trên các handle
const getNgayVN = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};


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

  if (!selectedClass) {
    showSnackbar("⚠️ Vui lòng chọn lớp!", "warning");
    return;
  }

  if (!selectedStudentId || !selectedStudentData) {
    showSnackbar("⚠️ Vui lòng chọn học sinh!", "warning");
    return;
  }

  if (!dangKy) {
    showSnackbar("⚠️ Vui lòng chọn trạng thái đăng ký!", "warning");
    return;
  }

  const dangKyBanTru = dangKy === "Hủy đăng ký" ? false : true;
  const diemDanhBanTru = dangKyBanTru;

  // ✅ Cập nhật context và UI ngay
  const updatedAllStudents = allStudents.map((s) =>
    s.maDinhDanh === selectedStudentData.maDinhDanh
      ? { ...s, dangKyBanTru, diemDanhBanTru }
      : s
  );

  setAllStudents(updatedAllStudents);
  setFilteredStudents(
    updatedAllStudents.map((s) => ({
      ...s,
      hoVaTen: s.hoVaTen || s.hoTen || "Không rõ tên",
      id: s.id || s.maDinhDanh,
    }))
  );
  setClassData(selectedClass, updatedAllStudents);

  // ✅ Hiển thị thông báo thành công ngay
  setSnackbar({
    open: true,
    message: "✅ Cập nhật thành công!",
    severity: "success",
  });
  setTimeout(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, 3000);

  // ✅ Ghi Firestore và nhật ký bất đồng bộ
  setSaving(true);
  try {
    const classRef = doc(db, `DANHSACH_${namHocValue}`, selectedClass);
    const classSnap = await getDoc(classRef);

    if (!classSnap.exists()) {
      console.warn("⚠️ Không tìm thấy dữ liệu lớp trong Firestore.");
      return;
    }

    const classDataRaw = classSnap.data();
    const updatedFields = {};
    let found = false;

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

    if (found) {
      await updateDoc(classRef, updatedFields);

      const logId = `${selectedStudentData.maDinhDanh}-${Date.now()}`;
      await setDoc(doc(db, `NHATKYBANTRU_${namHocValue}`, logId), {
        maDinhDanh: selectedStudentData.maDinhDanh,
        hoVaTen: selectedStudentData.hoVaTen || selectedStudentData.hoTen || "",
        lop: selectedClass,
        trangThai: dangKy,
        ngayDieuChinh: getNgayVN(),
      });
    } else {
      console.warn("⚠️ Không tìm thấy học sinh trong Firestore để cập nhật.");
    }
  } catch (error) {
    console.error("❌ Lỗi cập nhật:", error);
    showSnackbar("❌ Cập nhật thất bại khi ghi Firestore!", "error");
  } finally {
    setSaving(false);
  }
};

  // Xử lý cập nhật tên mới
const handleAddStudent = async (customHoTen) => {
  const name = (customHoTen ?? newStudentName ?? "").trim();
  if (!name || !selectedClass || !namHocValue) {
    showSnackbar("⚠️ Vui lòng chọn lớp và nhập tên học sinh", "warning");
    return;
  }

  const upperName = name.toUpperCase();

  // 🔎 Kiểm tra xem học sinh đã tồn tại trong lớp chưa (so sánh theo tên)
  const existingStudent = allStudents.find(
    (s) => (s.hoVaTen || s.hoTen)?.toUpperCase() === upperName
  );

  // ✅ Nếu học sinh đã tồn tại → chỉ bật diemDanhBanTru, KHÔNG ghi nhật ký
  if (existingStudent) {
    const updatedAllStudents = allStudents.map((s) =>
      s.id === existingStudent.id ? { ...s, diemDanhBanTru: true } : s
    );

    const sortedStudents = MySort(updatedAllStudents);
    setAllStudents(sortedStudents);
    setFilteredStudents(
      sortedStudents.map((s) => ({
        ...s,
        hoVaTen: s.hoVaTen || s.hoTen || "Không rõ tên",
        id: s.id || s.maDinhDanh,
      }))
    );
    setClassData(selectedClass, sortedStudents);
    setSelectedStudentId(existingStudent.id);

    // 🔥 Cập nhật Firestore nhưng không ghi nhật ký
    setSaving(true);
    try {
      const classRef = doc(db, `DANHSACH_${namHocValue}`, selectedClass);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) {
        console.warn("⚠️ Không tìm thấy dữ liệu lớp trong Firestore.");
        return;
      }

      const classDataRaw = classSnap.data();
      const danhSachField = "hocSinh";
      const currentList = Array.isArray(classDataRaw[danhSachField])
        ? classDataRaw[danhSachField]
        : [];

      const updatedList = currentList.map((hs) =>
        (hs.hoVaTen || hs.hoTen)?.toUpperCase() === upperName
          ? { ...hs, diemDanhBanTru: true }
          : hs
      );

      await updateDoc(classRef, {
        [danhSachField]: updatedList,
        updatedAt: getNgayVN(),
      });

      setSnackbar({
        open: true,
        message: "✅ Học sinh đã tồn tại, bạn không cần thêm mới!",
        severity: "info",
      });
      setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật học sinh:", err);
      showSnackbar("❌ Cập nhật học sinh thất bại khi ghi Firestore!", "error");
    } finally {
      setSaving(false);
    }

    return;
  }

  // ✅ Nếu học sinh chưa tồn tại → thêm mới và ghi nhật ký
  const newMaDinhDanh = `${selectedClass}-${nanoid(8)}`;
  const newStudent = {
    id: newMaDinhDanh,
    maDinhDanh: newMaDinhDanh,
    hoVaTen: upperName,
    lop: selectedClass,
    dangKyBanTru: true,
    diemDanh: true,
    diemDanhBanTru: true,
    stt: allStudents.length + 1,
  };

  const updatedAllStudents = [...allStudents, newStudent];
  const sortedStudents = MySort(updatedAllStudents);

  setAllStudents(sortedStudents);
  setFilteredStudents(
    sortedStudents.map((s) => ({
      ...s,
      hoVaTen: s.hoVaTen || s.hoTen || "Không rõ tên",
      id: s.id || s.maDinhDanh,
    }))
  );
  setClassData(selectedClass, sortedStudents);
  setSelectedStudentId(newMaDinhDanh);

  setSnackbar({
    open: true,
    message: "✅ Thêm học sinh thành công!",
    severity: "success",
  });
  setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);

  setSaving(true);
  try {
    const classRef = doc(db, `DANHSACH_${namHocValue}`, selectedClass);
    const classSnap = await getDoc(classRef);

    if (!classSnap.exists()) {
      console.warn("⚠️ Không tìm thấy dữ liệu lớp trong Firestore.");
      return;
    }

    const classDataRaw = classSnap.data();
    const danhSachField = "hocSinh";
    const currentList = Array.isArray(classDataRaw[danhSachField])
      ? classDataRaw[danhSachField]
      : [];

    // ❌ Bỏ `lop` và `ngayTao` khi lưu vào danh sách học sinh trong Firestore
    const firestoreStudent = {
      maDinhDanh: newStudent.maDinhDanh,
      hoTen: newStudent.hoVaTen,
      dangKyBanTru: true,
      diemDanh: true,
      diemDanhBanTru: true,
      stt: newStudent.stt,
    };

    await updateDoc(classRef, {
      [danhSachField]: [...currentList, firestoreStudent],
      updatedAt: getNgayVN(),
    });

    // 📝 Ghi nhật ký với logId dạng 1.1-MF7QB0PS-1694623456789
    const timestampNow = Date.now(); // 13 chữ số
    const logId = `${newMaDinhDanh}-${timestampNow}`;

    await setDoc(doc(db, `NHATKYBANTRU_${namHocValue}`, logId), {
      maDinhDanh: newMaDinhDanh,
      hoTen: upperName,
      lop: selectedClass,
      trangThai: "Đăng ký mới",
      ngayDieuChinh: getNgayVN(),
    });
  } catch (err) {
    console.error("❌ Lỗi khi thêm học sinh:", err);
    showSnackbar("❌ Thêm học sinh thất bại khi ghi Firestore!", "error");
  } finally {
    setSaving(false);
  }
};
    
const handleDeleteStudent = async () => {
  if (!selectedStudentId || !selectedClass || !namHocValue) return;

  // Tìm học sinh trong state hiện tại để hiển thị cảnh báo
  const studentToDelete = allStudents.find(s => s.maDinhDanh === selectedStudentId);
  if (!studentToDelete) {
    showSnackbar("⚠️ Không tìm thấy học sinh để xóa!", "warning");
    return;
  }

  const confirm = window.confirm(`Bạn có chắc muốn xóa học sinh ${studentToDelete.hoVaTen || studentToDelete.hoTen || "Không rõ tên"}? Nếu xóa, dữ liệu bán trú của học sinh này sẽ không thống kê được.`);
  if (!confirm) return;

  // ✅ Cập nhật context và UI ngay lập tức
  const updatedAllStudents = allStudents.filter(s => s.maDinhDanh !== selectedStudentId);
  setAllStudents(updatedAllStudents);
  setFilteredStudents(
    updatedAllStudents.map(s => ({
      ...s,
      hoVaTen: s.hoVaTen || s.hoTen || "Không rõ tên",
      id: s.id || s.maDinhDanh,
    }))
  );
  setClassData(selectedClass, updatedAllStudents);
  setSelectedStudentId("");

  showSnackbar("✅ Xóa học sinh thành công!", "success");

  // ✅ Tiến hành xóa khỏi Firestore và ghi nhật ký (không chặn UI)
  setSaving(true);
  try {
    const classRef = doc(db, `DANHSACH_${namHocValue}`, selectedClass);
    const classSnap = await getDoc(classRef);

    if (!classSnap.exists()) {
      console.warn("⚠️ Không tìm thấy dữ liệu lớp trong Firestore để xóa.");
      return;
    }

    const classDataRaw = classSnap.data();
    const updatedFields = {};
    let found = false;

    Object.entries(classDataRaw).forEach(([fieldKey, fieldValue]) => {
      if (Array.isArray(fieldValue)) {
        const updatedArray = fieldValue.filter(hs => {
          const match = hs.maDinhDanh === selectedStudentId;
          if (match) found = true;
          return !match;
        });
        updatedFields[fieldKey] = updatedArray;
      }
    });

    if (found) {
      await updateDoc(classRef, updatedFields);

      const logId = `${selectedStudentId}-${Date.now()}`;
      await setDoc(doc(db, `NHATKYBANTRU_${namHocValue}`, logId), {
        maDinhDanh: selectedStudentId,
        hoTen: studentToDelete.hoVaTen || studentToDelete.hoTen || "",
        lop: selectedClass,
        trangThai: "Xóa học sinh",
        ngayDieuChinh: getNgayVN(),
      });
    } else {
      console.warn("⚠️ Không tìm thấy học sinh trong Firestore để xóa.");
    }
  } catch (err) {
    console.error("❌ Lỗi khi xóa học sinh khỏi Firestore:", err);
    showSnackbar("❌ Xóa học sinh thất bại khi ghi Firestore!", "error");
  } finally {
    setSaving(false);
  }
};

  
  const handleUpdateName = async () => {
    const newName = editingName.trim().toUpperCase();

    if (!newName) {
      showSnackbar("⚠️ Vui lòng nhập tên học sinh!", "warning");
      return;
    }

    if (!namHocValue || !selectedClass || !selectedStudentId) {
      showSnackbar("⚠️ Thiếu thông tin để sửa tên học sinh!", "warning");
      return;
    }

    // ✅ Cập nhật context và UI ngay
    const updatedAllStudents = allStudents.map((s) =>
      s.maDinhDanh === selectedStudentId
        ? {
            ...s,
            hoVaTen: newName,
            hoTen: newName, // để đồng bộ nếu có component dùng hoTen
          }
        : s
    );

    setAllStudents(updatedAllStudents);

    // ✅ Cập nhật danh sách chọn học sinh
    const updatedFiltered = updatedAllStudents.map((s) => ({
      ...s,
      hoVaTen: s.hoVaTen || s.hoTen || "Không rõ tên",
      id: s.id || s.maDinhDanh,
    }));
    setFilteredStudents(updatedFiltered);

    // ✅ Cập nhật context lớp
    setClassData(selectedClass, updatedAllStudents);

    // ✅ Cập nhật lại tên đang sửa
    setEditingName(newName);
    setIsEditingName(true);

    // ✅ Hiển thị thông báo thành công ngay
    showSnackbar("✅ Đã sửa tên học sinh!", "success");
    setTimeout(() => setSnackbar(prev => ({ ...prev, open: false })), 3000);

    // ✅ Ghi Firestore bất đồng bộ
    setSaving(true);
    try {
      const classRef = doc(db, `DANHSACH_${namHocValue}`, selectedClass);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) return;

      const classDataRaw = classSnap.data();
      const updatedFields = {};
      let found = false;

      Object.entries(classDataRaw).forEach(([fieldKey, fieldValue]) => {
        if (Array.isArray(fieldValue)) {
          const updatedArray = fieldValue.map((hs) => {
            if (hs.maDinhDanh === selectedStudentId) {
              found = true;
              return { ...hs, hoTen: newName }; // ghi đúng field gốc
            }
            return hs;
          });
          updatedFields[fieldKey] = updatedArray;
        }
      });

      if (found) {
        await updateDoc(classRef, updatedFields);

        const logId = `${selectedStudentId}-${Date.now()}`;
        await setDoc(doc(db, `NHATKYBANTRU_${namHocValue}`, logId), {
          maDinhDanh: selectedStudentId,
          hoTen: newName,
          lop: selectedClass,
          trangThai: "Sửa tên",
          ngayDieuChinh: getNgayVN(),
        });
      }
    } catch (error) {
      console.error("❌ Lỗi khi sửa tên học sinh:", error);
      showSnackbar("❌ Sửa tên thất bại khi ghi Firestore!", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "transparent",
        pt: 1,
        px: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Box maxWidth={450} width="100%">
        <Card
          elevation={10}
          sx={{ p: 4, mt: 1, borderRadius: 4, backgroundColor: "white" }}
        >
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h5"
              align="center"
              fontWeight="bold"
              color="primary"
              gutterBottom
            >
              CẬP NHẬT DANH SÁCH
            </Typography>
            <Box
              sx={{
                height: "2.5px",
                width: "100%",
                backgroundColor: "#1976d2",
                borderRadius: 1,
                mt: 2,
                mb: 4,
              }}
            />
          </Box>

          {loading ? (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                my: 2,
              }}
            >
              <Box sx={{ width: "60%" }}>
                <LinearProgress />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Đang tải dữ liệu học sinh...
              </Typography>
            </Box>
          ) : (
            <>
              {/* Ô chọn lớp */}
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
                  }}
                >
                  <MenuItem value="">
                    <em>Chọn lớp</em>
                  </MenuItem>
                  {classList.map((cls) => (
                    <MenuItem key={cls} value={cls}>
                      {cls}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Ô chọn học sinh / thêm / sửa */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                {!isEditingName && !isAdding ? (
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <Select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!selectedClass}
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) return "Học sinh";
                        const student = filteredStudents.find(
                          (s) => s.maDinhDanh === selected
                        );
                        return student?.hoTen || student?.hoVaTen || "";
                      }}
                      sx={{ flex: 1 }}
                    >
                      {filteredStudents.map((s) => (
                        <MenuItem key={s.maDinhDanh} value={s.maDinhDanh}>
                          <Typography
                            sx={{
                              color: s.dangKyBanTru ? "#1976d2" : "inherit",
                            }}
                          >
                            {s.hoTen || s.hoVaTen}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>

                    {/* Nút thêm */}
                    <Tooltip title="Thêm học sinh mới" arrow>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => {
                          setNewStudentName("");
                          setIsAdding(true);
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>

                    {/* Nút sửa */}
                    <Tooltip title="Sửa tên học sinh" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={!selectedStudentId}
                        onClick={() => {
                          const student = filteredStudents.find(
                            (s) => s.maDinhDanh === selectedStudentId
                          );
                          setEditingName(student?.hoTen || student?.hoVaTen || "");
                          setIsEditingName(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    {/* Nút xóa */}
                    <Tooltip title="Xóa học sinh" arrow>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!selectedStudentId}
                          onClick={handleDeleteStudent}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ) : isEditingName ? (
                  // Chế độ sửa
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      mt: 1,
                      alignItems: "center",
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label="Học sinh"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />

                    <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<UpdateIcon />}
                        sx={{ width: 120 }}
                        onClick={() => {
                          handleUpdateName();
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        sx={{ width: 120 }}
                        onClick={() => {
                          setEditingName("");
                          setIsEditingName(false); // thoát chế độ sửa, trở về giao diện Cập nhật
                        }}
                      >
                        Hủy
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  // Chế độ thêm
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      mt: 1,
                      alignItems: "center",
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label="Học sinh mới"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                    />

                    <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<AddIcon />}
                        sx={{ width: 120 }}
                        onClick={() => {
                          handleAddStudent(newStudentName);
                        }}
                      >
                        Thêm
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        sx={{ width: 120 }}
                        onClick={() => {
                          setNewStudentName("");
                          setIsAdding(false);
                        }}
                      >
                        Hủy
                      </Button>
                    </Box>
                  </Box>
                )}
              </FormControl>

              {/* Trạng thái đăng ký + nút Cập nhật */}
              {!isAdding && !isEditingName && (
                <>
                  <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                    <InputLabel>Trạng thái đăng ký</InputLabel>
                    <Select
                      value={dangKy}
                      label="Trạng thái đăng ký"
                      onChange={(e) => setDangKy(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Chọn trạng thái</em>
                      </MenuItem>
                      {dangKyOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box
                    sx={{ display: "flex", justifyContent: "center", mt: 1, mb: 2 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleUpdate}
                      disabled={saving}
                      startIcon={<UpdateIcon />}
                      sx={{
                        width: 160,
                        fontWeight: 600,
                        py: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {saving ? "Cập nhật" : "Cập nhật"}
                    </Button>
                  </Box>
                </>
              )}

              {/* Snackbar + quay lại */}
              <Stack spacing={2} alignItems="center">
                {snackbar.open && (
                  <Alert
                    severity={snackbar.severity}
                    sx={{
                      width: "92%",
                      fontWeight: 500,
                      borderRadius: 2,
                      mt: 2,
                    }}
                  >
                    {snackbar.message}
                  </Alert>
                )}

                {!isAdding && !isEditingName && (
                  <Button onClick={onBack} color="secondary" sx={{ mt: 2 }}>
                    ⬅️ Quay lại
                  </Button>
                )}
              </Stack>
            </>
          )}
        </Card>
      </Box>
    </Box>
  );
}
