import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, TextField, Button, Stack,
  Card, Divider, Select, MenuItem, FormControl, InputLabel,
  RadioGroup, Radio, FormControlLabel, LinearProgress, Alert, Tabs, Tab, Checkbox, FormGroup
} from "@mui/material";
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

import { db } from "./firebase";
import {
  downloadBackupAsJSON,
  downloadBackupAsExcel
} from "./utils/backupUtils";
import {
  restoreFromJSONFile,
  restoreFromExcelFile
} from "./utils/restoreUtils";
import { deleteAllDateFields as handleDeleteAllUtil } from "./utils/deleteUtils";

import Banner from "./pages/Banner";
import { useNavigate } from "react-router-dom";

// ✅ Fix lỗi thiếu icon
import LockResetIcon from "@mui/icons-material/LockReset";
import { deleteField } from "firebase/firestore"; // 👈 nhớ import ở đầu file
import { useClassData } from "./context/ClassDataContext";

const ResetProgressText = ({ label, progress }) => (
  <Typography variant="caption" align="center" display="block" mt={0.5}>
    {label}... {progress}%
  </Typography>
);

export default function Admin({ onCancel }) {
  const [firestoreEnabled, setFirestoreEnabled] = useState(false);
  const [passwords, setPasswords] = useState({
    yte: "",
    ketoan: "",
    bgh: "",
    admin: ""
  });
  const [selectedAccount, setSelectedAccount] = useState("admin");
  const [newPassword, setNewPassword] = useState("");
  const [backupFormat, setBackupFormat] = useState("json");
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteSeverity, setDeleteSeverity] = useState("info");
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [setDefaultProgress, setSetDefaultProgress] = useState(0);
  const [setDefaultMessage, setSetDefaultMessage] = useState("");
  const [setDefaultSeverity, setSetDefaultSeverity] = useState("success");
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedYear, setSelectedYear] = useState("2024-2025");

  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [showRestoreOptions, setShowRestoreOptions] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  const [resetProgress, setResetProgress] = useState(0);
  const [resetMessage, setResetMessage] = useState("");
  const [resetSeverity, setResetSeverity] = useState("success");
  const [resetType, setResetType] = useState(""); // "diemdanh" | "dangky"

  const [restoreTriggered, setRestoreTriggered] = useState(false);
  const inputRef = useRef(null); 
  const { getClassData, setClassData } = useClassData();

  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false); 
  const [deletingLabel, setDeletingLabel] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  //const [xoaHSBanTru, setXoaHSBanTru] = useState(false);

  const [selectedBackupFile, setSelectedBackupFile] = useState(null);
  const [restoreReady, setRestoreReady] = useState(false);

  const [selectedDataTypes, setSelectedDataTypes] = useState({
    danhsach: false,
    bantru: false,
    diemdan: false,
  });

  const [deleteCollections, setDeleteCollections] = useState({
    danhsach: false,
    bantru: false,
    diemdan: false,
    nhatkybantru: false,
    xoaHocSinhBanTru: false,
  });

  const handleDeleteCheckboxChange = (key) => {
    setDeleteCollections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const [restoreMode, setRestoreMode] = useState("all"); // "all" hoặc "check"
  
  const navigate = useNavigate();

  const yearOptions = [
    "2024-2025", "2025-2026", "2026-2027", "2027-2028", "2028-2029"
  ];

  const handleCheckboxChange = (key) => {
    setSelectedDataTypes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    if (restoreTriggered && inputRef.current) {
      inputRef.current.click();
      setRestoreTriggered(false);
    }
  }, [restoreTriggered]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const accounts = ["admin", "yte", "ketoan", "bgh"];
        const newPasswords = {};
        for (const acc of accounts) {
          const snap = await getDoc(doc(db, "ACCOUNT", acc.toUpperCase()));
          newPasswords[acc] = snap.exists() ? snap.data().password || "" : "";
        }
        setPasswords(newPasswords);

        const toggleSnap = await getDoc(doc(db, "SETTINGS", "TAIDULIEU"));
        if (toggleSnap.exists()) setFirestoreEnabled(toggleSnap.data().theokhoi);
      } catch (error) {
        console.error("❌ Lỗi khi tải cấu hình:", error);
      }
    };

    const fetchYear = async () => {
      try {
        const yearSnap = await getDoc(doc(db, "YEAR", "NAMHOC"));
        if (yearSnap.exists()) {
          const firestoreYear = yearSnap.data().value;
          if (firestoreYear) setSelectedYear(firestoreYear);
        }
      } catch (error) {
        console.error("❌ Lỗi khi lấy năm học từ Firestore:", error);
      }
    };

    fetchSettings();
    fetchYear();
  }, []);

  useEffect(() => {
    if (restoreProgress === 100) {
      const timer = setTimeout(() => setRestoreProgress(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [restoreProgress]);

  const handleYearChange = async (newYear) => {
    setSelectedYear(newYear);
    try {
      await setDoc(doc(db, "YEAR", "NAMHOC"), { value: newYear });
    } catch (error) {
      console.error("❌ Lỗi khi ghi năm học vào Firestore:", error);
      alert("Không thể cập nhật năm học!");
    }
  };

  const handleToggleChange = async (e) => {
    const newValue = e.target.value === "khoi";
    setFirestoreEnabled(newValue);
    try {
      await setDoc(doc(db, "SETTINGS", "TAIDULIEU"), { theokhoi: newValue });
    } catch (error) {
      alert("❌ Không thể cập nhật chế độ Firestore!");
    }
  };

  const handleChangePassword = async (type) => {
    if (!newPassword.trim()) {
      alert("⚠️ Vui lòng nhập mật khẩu mới!");
      return;
    }

    const accountDisplayNames = {
      yte: "Y tế", ketoan: "Kế toán", bgh: "BGH", admin: "Admin"
    };

    try {
      await setDoc(
        doc(db, "ACCOUNT", type.toUpperCase()),
        { password: newPassword },
        { merge: true }
      );
      setPasswords((prev) => ({ ...prev, [type]: newPassword }));
      alert(`✅ Đã đổi mật khẩu cho tài khoản ${accountDisplayNames[type] || type}!`);
      setNewPassword("");
    } catch {
      alert("❌ Không thể đổi mật khẩu!");
    }
  };

  const handleCreateAccounts = async () => {
    try {
      const ref = doc(db, `DANHSACH_${selectedYear}`, "TRUONG");
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        alert("❌ Không tìm thấy dữ liệu TRUONG!");
        return;
      }

      const list = snap.data().list;
      if (!Array.isArray(list)) {
        alert("❌ Danh sách lớp không hợp lệ!");
        return;
      }

      const created = [];
      for (const lop of list) {
        await setDoc(doc(db, "ACCOUNT", lop), { password: "123456" });
        created.push(lop);
      }

      alert(`✅ Đã tạo ${created.length} tài khoản lớp: ${created.join(", ")}`);
    } catch (error) {
      console.error("❌ Lỗi khi tạo tài khoản:", error.message);
      alert("❌ Không thể tạo tài khoản lớp!");
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(`⚠️ Bạn có chắc chắn muốn xóa tất cả dữ liệu bán trú của năm ${selectedYear}?`);
    if (!confirmed) return;

    await handleDeleteAllUtil({
      setDeleteInProgress,
      setDeleteProgress,
      setDeleteMessage,
      setDeleteSeverity,
      namHocValue: selectedYear,
    });
  };

  const handleResetDangKyBanTru = async () => {
    const confirmed = window.confirm("⚠️ Bạn có chắc chắn muốn reset điểm danh bán trú?");
    if (!confirmed) return;

    try {
      setResetProgress(0);
      setResetMessage("");
      setResetSeverity("info");
      setResetType("dangky");

      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;
      if (!namHocValue) {
        setResetMessage("❌ Không tìm thấy năm học!");
        setResetSeverity("error");
        return;
      }

      const colName = `DANHSACH_${namHocValue}`;
      const snapshot = await getDocs(collection(db, colName));

      const total = snapshot.docs.length;
      let completed = 0;
      let count = 0;

      const batch = writeBatch(db);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.diemDanhBanTru === false) {
          batch.set(doc(db, colName, docSnap.id), { diemDanhBanTru: true }, { merge: true });
          count++;
        }
        completed++;
        setResetProgress(Math.round((completed / total) * 100));
      }

      await batch.commit(); // ✅ Ghi toàn bộ trong một lần duy nhất

      // 🔁 Cập nhật lại dữ liệu context classData nếu có
      const currentClassData = getClassData() || {};
      const updatedClassData = {};

      Object.entries(currentClassData).forEach(([classId, studentList]) => {
        updatedClassData[classId] = studentList.map((s) => ({
          ...s,
          diemDanhBanTru: s.diemDanhBanTru === false ? true : s.diemDanhBanTru
        }));
      });

      setClassData(updatedClassData);

      setResetMessage(`✅ Đã reset xong bán trú (${count} học sinh).`);
      setResetSeverity("success");
    } catch (err) {
      console.error("❌ Lỗi khi reset điểm danh bán trú:", err);
      setResetMessage("❌ Có lỗi xảy ra khi cập nhật.");
      setResetSeverity("error");
    } finally {
      setTimeout(() => setResetProgress(0), 3000);
    }
  };

  const handleResetDiemDanh = async () => {
    const confirmed = window.confirm("⚠️ Bạn có chắc chắn muốn reset điểm danh?");
    if (!confirmed) return;

    try {
      setResetProgress(0);
      setResetMessage("");
      setResetSeverity("info");
      setResetType("diemdanh");

      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;
      if (!namHocValue) {
        setResetMessage("❌ Không tìm thấy năm học!");
        setResetSeverity("error");
        return;
      }

      const colName = `DANHSACH_${namHocValue}`;
      const snapshot = await getDocs(collection(db, colName));

      const total = snapshot.docs.length;
      let completed = 0;
      let count = 0;

      const batch = writeBatch(db);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const updates = {};

        if (data.vang !== "") {
          updates.vang = "";
        }

        if (data.lyDo !== "") {
          updates.lyDo = "";
        }

        if (typeof data.phep === "boolean" || data.phep === null) {
          updates.phep = deleteField();
        }

        if (Object.keys(updates).length > 0) {
          batch.set(doc(db, colName, docSnap.id), updates, { merge: true });
          count++;
        }

        completed++;
        setResetProgress(Math.round((completed / total) * 100));
      }

      await batch.commit(); // ✅ Ghi tất cả trong một lần duy nhất

      setResetMessage(`✅ Đã reset xong điểm danh (${count} học sinh).`);
      setResetSeverity("success");
    } catch (err) {
      console.error("❌ Lỗi khi reset điểm danh:", err);
      setResetMessage("❌ Có lỗi xảy ra khi cập nhật.");
      setResetSeverity("error");
    } finally {
      setTimeout(() => setResetProgress(0), 3000);
    }
  };

  const handlePerformDelete = async () => {
    const namHocValue = selectedYear;
    const { danhsach, bantru, diemdan, nhatkybantru, xoaHocSinhBanTru } = deleteCollections;

    if (!danhsach && !bantru && !diemdan && !nhatkybantru && !xoaHocSinhBanTru) {
      alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để xóa.");
      return;
    }

    const confirmed = window.confirm("⚠️ Bạn có chắc chắn muốn xóa dữ liệu đã chọn?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setProgress(0);

      let totalDeletedCount = 0;

      if (danhsach) {
        setDeletingLabel("Đang xóa danh sách...");
        const snap = await getDocs(collection(db, `DANHSACH_${namHocValue}`));
        const total = snap.docs.length;
        for (let i = 0; i < total; i++) {
          await deleteDoc(snap.docs[i].ref);
          totalDeletedCount++;
          setProgress(Math.round(((i + 1) / total) * 100));
        }
      }

      if (diemdan) {
        setDeletingLabel("Đang xóa điểm danh...");
        const snap = await getDocs(collection(db, `DIEMDANH_${namHocValue}`));
        const total = snap.docs.length;
        for (let i = 0; i < total; i++) {
          await deleteDoc(snap.docs[i].ref);
          totalDeletedCount++;
          setProgress(Math.round(((i + 1) / total) * 100));
        }
      }

      if (bantru) {
        setDeletingLabel("Đang xóa bán trú...");
        const snap = await getDocs(collection(db, `BANTRU_${namHocValue}`));
        const total = snap.docs.length;
        for (let i = 0; i < total; i++) {
          await deleteDoc(snap.docs[i].ref);
          totalDeletedCount++;
          setProgress(Math.round(((i + 1) / total) * 100));
        }
      }

      if (nhatkybantru) {
        setDeletingLabel("Đang xóa nhật ký bán trú...");
        const snap = await getDocs(collection(db, `NHATKYBANTRU_${namHocValue}`));
        const total = snap.docs.length;
        for (let i = 0; i < total; i++) {
          await deleteDoc(snap.docs[i].ref);
          totalDeletedCount++;
          setProgress(Math.round(((i + 1) / total) * 100));
        }
      }

      // ✅ Thêm logic xóa field của học sinh bán trú
      if (xoaHocSinhBanTru) {
        setDeletingLabel("Đang xử lý học sinh bán trú...");
        try {
          const danhSachRef = collection(db, `DANHSACH_${namHocValue}`);
          const banTruRef = collection(db, `BANTRU_${namHocValue}`);

          const [danhSachSnap, banTruSnap] = await Promise.all([
            getDocs(danhSachRef),
            getDocs(banTruRef),
          ]);

          const hocSinhCanKiemTra = [];
          danhSachSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.dangKyBanTru === false) {
              hocSinhCanKiemTra.push({
                id: docSnap.id,
                ref: docSnap.ref,
                hoTen: data.hoVaTen || "(Không có tên)",
              });
            }
          });

          const banTruIDs = new Set(banTruSnap.docs.map((doc) => doc.id));

          const batch = writeBatch(db);
          let count = 0;
          const tenHocSinhDaXoa = [];

          hocSinhCanKiemTra.forEach(({ id, ref, hoTen }) => {
            if (!banTruIDs.has(id)) {
              batch.update(ref, {
                dangKyBanTru: deleteField(),
                diemDanhBanTru: deleteField(),
              });
              count++;
              totalDeletedCount++;
              tenHocSinhDaXoa.push(hoTen);
            }
          });

          await batch.commit();

          setDeleteMessage(`✅ Đã xoá field 'dangKyBanTru' và 'diemDanhBanTru' của ${count} học sinh.`);
          setDeleteSeverity("success");

        } catch (err) {
          console.error("❌ Lỗi khi xử lý học sinh bán trú:", err);
          setDeleteMessage("❌ Lỗi khi xoá field học sinh bán trú.");
          setDeleteSeverity("error");
        }
      }

      if (totalDeletedCount === 0) {
        setDeleteMessage("ℹ️ Không phát hiện dòng dữ liệu nào để xóa.");
        setDeleteSeverity("info");
      } else {
        setDeleteMessage(`✅ Đã xóa xong dữ liệu (${totalDeletedCount} dòng).`);
        setDeleteSeverity("success");
      }
      setDeleteSeverity("success");
      setDeleteSuccess(true);
      setDeleteCollections({
        danhsach: false,
        bantru: false,
        diemdan: false,
        nhatkybantru: false,
        xoaHocSinhBanTru: false,
      });
      setShowDeleteOptions(false);
    } catch (err) {
      console.error("❌ Lỗi khi xóa dữ liệu:", err);
      setDeleteMessage("❌ Có lỗi xảy ra khi xóa.");
      setDeleteSeverity("error");
      setDeleteSuccess(false);
    } finally {
      setTimeout(() => {
        setDeleting(false);
        setDeletingLabel("");
        setProgress(0);
        setDeleteSuccess(false);
      }, 1500);
    }
  };

  const handleInitNewYearData = async () => {
    const confirmed = window.confirm(`⚠️ Bạn có chắc muốn khởi tạo dữ liệu cho năm ${selectedYear}?`);
    if (!confirmed) return;

    const danhSachDocs = ["K1", "K2", "K3", "K4", "K5", "TRUONG"];

    try {
      for (const docName of danhSachDocs) {
        await setDoc(doc(db, `DANHSACH_${selectedYear}`, docName), { list: "" });
      }

      await setDoc(doc(db, `BANTRU_${selectedYear}`, "init"), { temp: "" });
      alert(`✅ Đã khởi tạo dữ liệu cho năm học ${selectedYear}`);
    } catch (err) {
      console.error("❌ Lỗi khi khởi tạo dữ liệu:", err);
      alert("❌ Không thể khởi tạo dữ liệu năm mới!");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd" }}>
      <Banner title="QUẢN TRỊ HỆ THỐNG" />
      <Box sx={{ width: { xs: "95%", sm: 650 }, mx: "auto", mt: 3 }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          <Tabs
            value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="⚙️ SYSTEM" />
            <Tab label="👤 ACCOUNT" />
            <Tab label="💾 BACKUP & RESTORE" />
            <Tab label="🧹 DELETE & RESET" />
          </Tabs>

          {/* Tab 0: System */}
          {tabIndex === 0 && (
            <Stack spacing={3} mt={3} sx={{ maxWidth: 300, mx: "auto", width: "100%" }}>
              <Button variant="contained" onClick={() => navigate("/quanly")}>
                🏫 HỆ THỐNG QUẢN LÝ BÁN TRÚ
              </Button>

              <FormControl fullWidth size="small">
                <InputLabel>Năm học</InputLabel>
                <Select value={selectedYear} label="Năm học" onChange={(e) => handleYearChange(e.target.value)}>
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Loại tài khoản</InputLabel>
                <Select value={selectedAccount} label="Loại tài khoản" onChange={(e) => setSelectedAccount(e.target.value)}>
                  <MenuItem value="yte">🏥 Y tế</MenuItem>
                  <MenuItem value="ketoan">💰 Kế toán</MenuItem>
                  <MenuItem value="bgh">📋 BGH</MenuItem>
                  <MenuItem value="admin">🔐 Admin</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="🔑 Mật khẩu mới"
                type="password"
                value={newPassword}
                size="small"
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Button
                variant="contained"
                color="warning"
                onClick={() => handleChangePassword(selectedAccount)}
                startIcon={<LockResetIcon />}
              >
                Đổi mật khẩu
              </Button>

              <FormControl>
                <Typography variant="subtitle1" fontWeight="bold">
                  📊 Tải dữ liệu từ Firestore
                </Typography>
                <RadioGroup row value={firestoreEnabled ? "khoi" : "lop"} onChange={handleToggleChange}>
                  <FormControlLabel value="khoi" control={<Radio />} label="Tải theo khối" />
                  <FormControlLabel value="lop" control={<Radio />} label="Tải theo lớp" />
                </RadioGroup>
              </FormControl>
            </Stack>
          )}

          {tabIndex === 1 && (
            <Stack spacing={3} mt={3} sx={{ maxWidth: 300, mx: "auto", width: "100%" }}>
              <Divider> <Typography fontWeight="bold">👤 Database & Account</Typography> </Divider>
              
              <Button
                variant="contained"
                onClick={handleInitNewYearData}
                sx={{ backgroundColor: '#303f9f', '&:hover': { backgroundColor: '#2e7d32' } }}
              >
                🆕 Tạo Database năm mới
              </Button>

              <Button
                variant="contained"
                onClick={handleInitNewYearData}
                sx={{ backgroundColor: '#303f9f', '&:hover': { backgroundColor: '#2e7d32' } }}
              >
                🆕 Tạo tài khoản người dùng
              </Button>
            </Stack>
          )}

          {/* Tab 3: Backup & Restore */}
          {tabIndex === 2 && (
            <Stack spacing={3} mt={3} sx={{ maxWidth: 300, mx: "auto", width: "100%" }}>
              <Divider>
                <Typography fontWeight="bold">💾 Sao lưu & Phục hồi</Typography>
              </Divider>

              {/* Nút SAO LƯU */}
              {!showRestoreOptions && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => {
                    setShowBackupOptions(true);
                    setShowRestoreOptions(false);
                    setSelectedDataTypes({ danhsach: false, bantru: false, diemdan: false });
                  }}
                >
                  📥 Sao lưu dữ liệu
                </Button>
              )}

              {/* Nút PHỤC HỒI */}
              {!showBackupOptions && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    setSelectedDataTypes({ danhsach: false, bantru: false, diemdan: false });
                    setSelectedBackupFile(null);
                    if (inputRef.current) {
                      inputRef.current.value = "";
                      inputRef.current.click();
                    }
                  }}
                >
                  🔁 Phục hồi dữ liệu
                </Button>
              )}

              {/* Giao diện SAO LƯU */}
              {showBackupOptions && (
                <>
                  {/* Checkbox chọn dữ liệu */}
                  <Stack spacing={0.5}>
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.danhsach} onChange={() => handleCheckboxChange("danhsach")} />}
                      label="Danh sách"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.bantru} onChange={() => handleCheckboxChange("bantru")} />}
                      label="Bán trú"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.diemdan} onChange={() => handleCheckboxChange("diemdan")} />}
                      label="Điểm danh"
                    />
                  </Stack>

                  {/* Radio chọn định dạng */}
                  <FormControl component="fieldset" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Chọn định dạng:</Typography>
                    <RadioGroup
                      row
                      value={backupFormat}
                      onChange={(e) => setBackupFormat(e.target.value)}
                    >
                      <FormControlLabel value="json" control={<Radio />} label="JSON" />
                      <FormControlLabel value="excel" control={<Radio />} label="Excel" />
                    </RadioGroup>
                  </FormControl>

                  {/* Nút Thực hiện & Hủy */}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ width: "50%" }}
                      onClick={() => {
                        const isEmpty =
                          !selectedDataTypes.danhsach &&
                          !selectedDataTypes.bantru &&
                          !selectedDataTypes.diemdan;

                        if (isEmpty) {
                          alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để sao lưu.");
                          return;
                        }

                        if (backupFormat === "json") {
                          downloadBackupAsJSON(selectedDataTypes);
                        } else {
                          downloadBackupAsExcel(selectedDataTypes);
                        }

                        setShowBackupOptions(false);
                      }}
                    >
                      ✅ Sao lưu
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ width: "50%" }}
                      onClick={() => {
                        setShowBackupOptions(false);
                        setSelectedDataTypes({ danhsach: false, bantru: false, diemdan: false });
                      }}
                    >
                      ❌ Hủy
                    </Button>
                  </Stack>
                </>
              )}

              {/* Input chọn file phục hồi ẩn */}
              <input
                type="file"
                hidden
                ref={inputRef}
                accept={backupFormat === "json" ? ".json" : ".xlsx"}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;

                  const isValid =
                    (backupFormat === "json" && file.name.endsWith(".json")) ||
                    (backupFormat === "excel" && file.name.endsWith(".xlsx"));

                  if (isValid) {
                    setSelectedBackupFile(file);
                    setTimeout(() => setShowRestoreOptions(true), 0);
                  } else {
                    alert("❌ File không hợp lệ! Vui lòng chọn file đúng định dạng.");
                  }
                }}
              />

              {/* Giao diện PHỤC HỒI */}
              {showRestoreOptions && selectedBackupFile && (
                <>
                  <Stack spacing={0.5} sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.danhsach} onChange={() => handleCheckboxChange("danhsach")} />}
                      label="Danh sách"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.bantru} onChange={() => handleCheckboxChange("bantru")} />}
                      label="Bán trú"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.diemdan} onChange={() => handleCheckboxChange("diemdan")} />}
                      label="Điểm danh"
                    />
                  </Stack>

                  <FormControl component="fieldset" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Chọn định dạng:</Typography>
                    <RadioGroup
                      row
                      value={backupFormat}
                      onChange={(e) => setBackupFormat(e.target.value)}
                    >
                      <FormControlLabel value="json" control={<Radio />} label="JSON" />
                      <FormControlLabel value="excel" control={<Radio />} label="Excel" />
                    </RadioGroup>
                  </FormControl>

                  <FormControl component="fieldset" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Chế độ phục hồi:</Typography>
                    <RadioGroup
                      row
                      value={restoreMode}
                      onChange={(e) => setRestoreMode(e.target.value)}
                    >
                      <FormControlLabel value="all" control={<Radio />} label="Ghi đè tất cả" />
                      <FormControlLabel value="check" control={<Radio />} label="Chỉ ghi mới" />
                    </RadioGroup>
                  </FormControl>

                  {/* Nút Thực hiện & Hủy */}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ width: "50%" }}
                      onClick={() => {
                        const isEmpty =
                          !selectedDataTypes.danhsach &&
                          !selectedDataTypes.bantru &&
                          !selectedDataTypes.diemdan;

                        if (isEmpty) {
                          alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để phục hồi.");
                          return;
                        }

                        if (!selectedBackupFile) {
                          alert("❌ Chưa chọn file phục hồi.");
                          return;
                        }

                        if (backupFormat === "json") {
                          restoreFromJSONFile(
                            selectedBackupFile,
                            setRestoreProgress,
                            setAlertMessage,
                            setAlertSeverity,
                            selectedDataTypes,
                            restoreMode
                          );
                        } else {
                          restoreFromExcelFile(
                            selectedBackupFile,
                            setRestoreProgress,
                            setAlertMessage,
                            setAlertSeverity,
                            selectedDataTypes,
                            restoreMode
                          );
                        }

                        setShowRestoreOptions(false);
                        setSelectedBackupFile(null);
                      }}
                    >
                      ✅ PHỤC HỒI
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ width: "50%" }}
                      onClick={() => {
                        setShowRestoreOptions(false);
                        setSelectedBackupFile(null);
                        setSelectedDataTypes({ danhsach: false, bantru: false, diemdan: false });
                      }}
                    >
                      ❌ Hủy
                    </Button>
                  </Stack>
                </>
              )}

              {/* Tiến trình phục hồi */}
              {restoreProgress > 0 && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={restoreProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" align="center" display="block" mt={0.5}>
                    Đang phục hồi... {restoreProgress}%
                  </Typography>
                </Box>
              )}

              {/* Thông báo */}
              {alertMessage && (
                <Alert severity={alertSeverity} onClose={() => setAlertMessage("")}>
                  {alertMessage}
                </Alert>
              )}
            </Stack>
          )}



          {tabIndex === 3 && (
            <Stack spacing={3} mt={3} sx={{ maxWidth: 300, mx: "auto", width: "100%" }}>
              <Divider>
                <Typography fontWeight="bold">🗑️ Xóa & Reset dữ liệu</Typography>
              </Divider>

              {/* Nút bật/tắt nhóm checkbox + thực hiện xóa */}
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setShowDeleteOptions(prev => !prev);
                  setDeleteCollections({ danhsach: false, bantru: false, diemdan: false, nhatkybantru: false, xoaHocSinhBanTru: false });
                }}
              >
                🗑️ Xóa Database
              </Button>

              {/* ✅ Khối checkbox + nút thực hiện xóa */}
              {showDeleteOptions && (
                <>
                  <FormGroup sx={{ ml: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={deleteCollections.danhsach}
                          onChange={() => handleDeleteCheckboxChange("danhsach")}
                        />
                      }
                      label="Danh sách"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={deleteCollections.bantru}
                          onChange={() => handleDeleteCheckboxChange("bantru")}
                        />
                      }
                      label="Bán trú"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={deleteCollections.diemdan}
                          onChange={() => handleDeleteCheckboxChange("diemdan")}
                        />
                      }
                      label="Điểm danh"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={deleteCollections.nhatkybantru}
                          onChange={() => handleDeleteCheckboxChange("nhatkybantru")}
                        />
                      }
                      label="Lịch sử đăng ký"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={deleteCollections.xoaHocSinhBanTru}
                          onChange={() => handleDeleteCheckboxChange("xoaHocSinhBanTru")}
                        />
                      }
                      label="Xóa học sinh bán trú"
                    />
                  </FormGroup>

                  {/* Hai nút: Thực hiện xóa + Hủy */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ width: "50%" }}
                      onClick={handlePerformDelete}
                    >
                      ✅ Xóa dữ liệu
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ width: "50%" }}
                      onClick={() => {
                        setShowDeleteOptions(false);
                        setDeleteCollections({ danhsach: false, bantru: false, diemdan: false, nhatkybantru: false, xoaHocSinhBanTru: false });
                      }}
                    >
                      ❌ Hủy
                    </Button>
                  </Stack>

                  {deleting && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <ResetProgressText label={deletingLabel} progress={progress} />
                    </Box>
                  )}
                </>
              )}

              {/* Ẩn 2 nút reset nếu đang mở delete options */}
              {!showDeleteOptions && (
                <>
                  <Button variant="contained" color="warning" onClick={handleResetDangKyBanTru}>
                    ♻️ Reset bán trú
                  </Button>

                  <Button variant="contained" color="warning" onClick={handleResetDiemDanh}>
                    ♻️ Reset điểm danh
                  </Button>
                </>
              )}

              {/* ✅ Tiến trình cho hành động xóa & reset legacy */}
              {(deleteProgress > 0 || setDefaultProgress > 0) && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={deleteProgress || setDefaultProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" align="center" display="block" mt={0.5}>
                    {deleteProgress > 0
                      ? `Đang xóa dữ liệu bán trú... ${deleteProgress}%`
                      : `Đang reset legacy... ${setDefaultProgress}%`}
                  </Typography>
                </Box>
              )}

              {/* ✅ Tiến trình cho đăng ký và điểm danh bán trú */}
              {resetProgress > 0 && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={resetProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <ResetProgressText
                    label={
                      resetType === "dangky"
                        ? "Đang reset bán trú"
                        : "Đang reset điểm danh"
                    }
                    progress={resetProgress}
                  />
                </Box>
              )}

              {/* 🔔 Thông báo kết quả */}
              {deleteMessage && (
                <Alert severity={deleteSeverity} onClose={() => setDeleteMessage("")}>
                  {deleteMessage}
                </Alert>
              )}

              {setDefaultMessage && (
                <Alert severity={setDefaultSeverity} onClose={() => setSetDefaultMessage("")}>
                  {setDefaultMessage}
                </Alert>
              )}

              {resetMessage && (
                <Alert severity={resetSeverity} onClose={() => setResetMessage("")}>
                  {resetMessage}
                </Alert>
              )}
            </Stack>
          )}


        </Card>
      </Box>
    </Box>
  );
}


