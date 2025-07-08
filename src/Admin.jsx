import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Stack,
  Card, Divider, Select, MenuItem, FormControl, InputLabel,
  RadioGroup, Radio, FormControlLabel, LinearProgress, Alert, Tabs, Tab
} from "@mui/material";
import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore";
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
import { xoaTatCaDiemDanh } from "./utils/xoaTatCaDiemDanh";


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

  const navigate = useNavigate();

  const yearOptions = [
    "2024-2025", "2025-2026", "2026-2027", "2027-2028", "2028-2029"
  ];

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
    const confirmed = window.confirm(`⚠️ Bạn có chắc chắn muốn xóa tất cả dữ liệu điểm danh của năm ${selectedYear}?`);
    if (!confirmed) return;

    await handleDeleteAllUtil({
      setDeleteInProgress,
      setDeleteProgress,
      setDeleteMessage,
      setDeleteSeverity,
      namHocValue: selectedYear,
    });
  };

  const handleSetDefault = async () => {
    const confirmed = window.confirm("⚠️ Bạn có chắc muốn reset đăng ký bán trú?");
    if (!confirmed) return;

    try {
      setSetDefaultProgress(0);
      setSetDefaultMessage("");
      setSetDefaultSeverity("info");

      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;
      if (!namHocValue) {
        setSetDefaultMessage("❌ Không tìm thấy năm học hợp lệ trong hệ thống!");
        setSetDefaultSeverity("error");
        return;
      }

      const collectionName = `BANTRU_${namHocValue}`;
      const snapshot = await getDocs(collection(db, collectionName));
      const docs = snapshot.docs;
      const total = docs.length;
      let completed = 0;

      for (const docSnap of docs) {
        const data = docSnap.data();
        const newData = {
          ...data,
          vang: "",
          lyDo: "",
          ...(data.huyDangKy !== "x" && { huyDangKy: "T" })
        };
        await setDoc(doc(db, collectionName, docSnap.id), newData);
        completed++;
        setSetDefaultProgress(Math.round((completed / total) * 100));
      }

      setSetDefaultMessage("✅ Đã reset điểm danh!");
      setSetDefaultSeverity("success");
    } catch {
      setSetDefaultMessage("❌ Lỗi khi cập nhật huyDangKy.");
      setSetDefaultSeverity("error");
    } finally {
      setTimeout(() => setSetDefaultProgress(0), 3000);
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

          {/* Tab 1: Database */}
          {tabIndex === 2 && (
            <Stack spacing={3} mt={3} sx={{ maxWidth: 300, mx: "auto", width: "100%" }}>
              <Divider><Typography fontWeight="bold">💾 Sao lưu & Phục hồi</Typography></Divider>

              <RadioGroup row value={backupFormat} onChange={(e) => setBackupFormat(e.target.value)}>
                <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
                  <FormControlLabel value="json" control={<Radio />} label="JSON" />
                  <FormControlLabel value="excel" control={<Radio />} label="Excel" />
                </Box>
              </RadioGroup>

              <Button
                variant="contained"
                color="success"
                onClick={() =>
                  backupFormat === "json"
                    ? downloadBackupAsJSON()
                    : downloadBackupAsExcel()
                }
              >
                📥 Sao lưu ({backupFormat.toUpperCase()})
              </Button>

              <Button variant="contained" color="secondary" component="label">
                🔁 Phục hồi ({backupFormat.toUpperCase()})
                <input
                  type="file"
                  accept={backupFormat === "json" ? ".json" : ".xlsx"}
                  hidden
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (!window.confirm("⚠️ Phục hồi sẽ ghi đè dữ liệu. Tiếp tục?")) {
                      e.target.value = "";
                      return;
                    }
                    const restore = async () => {
                      if (backupFormat === "json") {
                        await restoreFromJSONFile(file, setRestoreProgress, setAlertMessage, setAlertSeverity);
                      } else {
                        await restoreFromExcelFile(file, setRestoreProgress, setAlertMessage, setAlertSeverity);
                      }
                      e.target.value = "";
                    };
                    restore();
                  }}
                />
              </Button>

              {(restoreProgress > 0) && (
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
                <Typography fontWeight="bold" >🗑️ Xóa & Reset dữ liệu</Typography>
              </Divider>

              <Button variant="contained" color="error" onClick={handleDeleteAll}>
                🗑️ Xóa dữ liệu bán trú
              </Button>

              <Button variant="contained" color="warning" onClick={handleSetDefault}>
                ♻️ Reset đăng ký bán trú
              </Button>

              <Button variant="contained" color="warning" onClick={xoaTatCaDiemDanh}>
                ♻️ Reset điểm danh
              </Button>

              {(deleteProgress > 0 || setDefaultProgress > 0) && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={deleteProgress || setDefaultProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" align="center" display="block" mt={0.5}>
                    {deleteProgress > 0
                      ? `Đang xóa... ${deleteProgress}%`
                      : `Đang reset... ${setDefaultProgress}%`}
                  </Typography>
                </Box>
              )}

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
            </Stack>
          )}


        </Card>
      </Box>
    </Box>
  );
}
