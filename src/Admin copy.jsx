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

// ✅ Thêm dòng này để sửa lỗi icon chưa định nghĩa
import LockResetIcon from "@mui/icons-material/LockReset";

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
  const navigate = useNavigate();

  const [selectedYear, setSelectedYear] = useState("2024-2025");

  const yearOptions = [
    "2024-2025",
    "2025-2026",
    "2026-2027",
    "2027-2028",
    "2028-2029"
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
          if (firestoreYear) {
            setSelectedYear(firestoreYear);
          }
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
      await setDoc(doc(db, "YEAR", "NAMHOC"), {
        value: newYear
      });

      console.log(`✅ Đã cập nhật năm học: ${newYear}`);
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

    
    // Mapping tên hiển thị cho các tài khoản
    const accountDisplayNames = {
      yte: "Y tế",
      ketoan: "Kế toán",
      bgh: "BGH",
      admin: "Admin"
    };

    try {
      await setDoc(
        doc(db, "ACCOUNT", type.toUpperCase()),
        { password: newPassword },
        { merge: true } // Giữ lại các field khác
      );

      setPasswords((prev) => ({
        ...prev,
        [type]: newPassword
      }));

      const displayName = accountDisplayNames[type] || type;
      alert(`✅ Đã đổi mật khẩu cho tài khoản ${displayName}!`);
      setNewPassword("");
    } catch (err) {
      alert("❌ Không thể đổi mật khẩu!");
    }
  };

  const handleCreateAccounts = async () => {
  try {
    const truongRef = doc(db, "DANHSACH_2024-2025", "TRUONG");
    const truongSnap = await getDoc(truongRef);

    if (!truongSnap.exists()) {
      alert("❌ Không tìm thấy dữ liệu TRUONG!");
      return;
    }

    const list = truongSnap.data().list; // là mảng như ["1.1", "1.2", "2.1"]
      if (!Array.isArray(list)) {
        alert("❌ Danh sách lớp không hợp lệ!");
        return;
      }

      const created = [];

      for (const lop of list) {
        await setDoc(doc(db, "ACCOUNT", lop), {
          password: "123456" // hoặc sinh mật khẩu riêng cho mỗi lớp
        });
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
      namHocValue: selectedYear, // ✅ Truyền giá trị năm học động vào đây
    });
  };


  const handleSetDefault = async () => {
    const confirmed = window.confirm("⚠️ Bạn có chắc muốn reset điểm danh?");
    if (!confirmed) return;

    try {
      setSetDefaultProgress(0);
      setSetDefaultMessage("");
      setSetDefaultSeverity("info");

      // 🔍 Lấy năm học hiện tại từ YEAR/NAMHOC
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
        let newData = {
          ...data,
          vang: "",
          lyDo: ""
        };
        if (data.huyDangKy !== "x") {
          newData.huyDangKy = "T";
        }
        await setDoc(doc(db, collectionName, docSnap.id), newData);
        completed++;
        setSetDefaultProgress(Math.round((completed / total) * 100));
      }

      setSetDefaultMessage("✅ Đã reset điểm danh!");
      setSetDefaultSeverity("success");
    } catch (error) {
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
      // ✅ Khởi tạo các tài liệu bên trong DANHSACH
      for (const docName of danhSachDocs) {
        await setDoc(doc(db, `DANHSACH_${selectedYear}`, docName), {
          list:""
        });
      }

      // ✅ Khởi tạo tài liệu init trong BANTRU (không dùng "__init__")
      await setDoc(doc(db, `BANTRU_${selectedYear}`, "init"), {
        temp: ""
      });

      alert(`✅ Đã khởi tạo dữ liệu cho năm học ${selectedYear}`);
    } catch (err) {
      console.error("❌ Lỗi khi khởi tạo dữ liệu:", err);
      alert("❌ Không thể khởi tạo dữ liệu năm mới!");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd" }}>
      <Banner title="QUẢN TRỊ HỆ THỐNG" />
      <Box sx={{ width: { xs: "95%", sm: 450 }, mx: "auto", mt: 3 }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          <Tabs
            value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="⚙️ System" />
            <Tab label="🗄️ Database" />
          </Tabs>

          {tabIndex === 0 && (
            <Stack spacing={3} mt={3} sx={{ maxWidth: 300, mx: "auto", width: "100%" }}>
              <Button variant="contained" onClick={() => navigate("/quanly")} sx={{ maxWidth: 300, width: "100%" }}>
                🏫 HỆ THỐNG QUẢN LÝ BÁN TRÚ
              </Button>

              <FormControl fullWidth sx={{ maxWidth: 300 }}>
                <InputLabel id="year-select-label">Năm học</InputLabel>
                <Select
                  labelId="year-select-label"
                  label="Năm học"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)} // ← Gọi hàm ghi Firestore
                >
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="info"
                onClick={handleInitNewYearData}
                sx={{
                  maxWidth: 300,
                  width: "100%",
                  backgroundColor: "#0288d1", // xanh dương nhạt
                  "&:hover": { backgroundColor: "#01579b" }
                }}
              >
                🆕 Khởi tạo dữ liệu năm mới
              </Button>

              <FormControl fullWidth sx={{ maxWidth: 300 }}>
                <InputLabel id="account-select-label">Loại tài khoản</InputLabel>
                <Select
                  labelId="account-select-label"
                  label="Loại tài khoản"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                >
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
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                sx={{ maxWidth: 300 }}
              />
              <Button
                variant="contained"
                color="warning"
                onClick={() => handleChangePassword(selectedAccount)}
                sx={{ maxWidth: 300, width: "100%" }}
                startIcon={<LockResetIcon />}
              >
                Đổi mật khẩu
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCreateAccounts}
                sx={{ maxWidth: 300, width: "100%" }}
              >
                🆕 Tạo tài khoản mặc định
              </Button>

              <FormControl>
                <Typography variant="subtitle1" fontWeight="bold">
                  📊 Tải dữ liệu từ Firestore
                </Typography>
                <RadioGroup
                  row
                  value={firestoreEnabled ? "khoi" : "lop"}
                  onChange={handleToggleChange}
                >
                  <FormControlLabel value="khoi" control={<Radio />} label="Tải theo khối" />
                  <FormControlLabel value="lop" control={<Radio />} label="Tải theo lớp" />
                </RadioGroup>
              </FormControl>
            </Stack>
          )}

          {tabIndex === 1 && (
            <Stack spacing={3} mt={3} sx={{ maxWidth: 300, mx: "auto", width: "100%" }}>
              <Divider>
                <Typography fontWeight="bold">💾 Sao lưu & Phục hồi</Typography>
              </Divider>

              <RadioGroup
                row
                value={backupFormat}
                onChange={(e) => setBackupFormat(e.target.value)}
              >
                <FormControlLabel value="json" control={<Radio />} label="JSON" />
                <FormControlLabel value="excel" control={<Radio />} label="Excel" />
              </RadioGroup>

              <Button
                variant="contained"
                color="success"
                onClick={() => backupFormat === "json" ? downloadBackupAsJSON() : downloadBackupAsExcel()}
                sx={{ maxWidth: 300, width: "100%" }}
              >
                📥 Sao lưu ({backupFormat.toUpperCase()})
              </Button>

              <Button
                variant="contained"
                color="secondary"
                component="label"
                sx={{ maxWidth: 300, width: "100%" }}
              >
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

              <Divider>
                <Typography fontWeight="bold" color="error">🗑️ Xóa & Reset dữ liệu</Typography>
              </Divider>

              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteAll}
                sx={{ maxWidth: 300, width: "100%", backgroundColor: "#d32f2f", "&:hover": { backgroundColor: "#9a0007" } }}
              >
                🗑️ Xóa Database Firestore
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={handleSetDefault}
                sx={{ maxWidth: 300, width: "100%" }}
              >
                ♻️ Reset điểm danh
              </Button>
              
              {(restoreProgress > 0 || deleteProgress > 0 || setDefaultProgress > 0) && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={restoreProgress || deleteProgress || setDefaultProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" align="center" display="block" mt={0.5}>
                    {restoreProgress > 0
                      ? `Đang phục hồi... ${restoreProgress}%`
                      : deleteProgress > 0
                        ? `Đang xóa... ${deleteProgress}%`
                        : `Đang reset... ${setDefaultProgress}%`}
                  </Typography>
                </Box>
              )}

              {alertMessage && <Alert severity={alertSeverity} onClose={() => setAlertMessage("")}>{alertMessage}</Alert>}
              {deleteMessage && <Alert severity={deleteSeverity} onClose={() => setDeleteMessage("")}>{deleteMessage}</Alert>}
              {setDefaultMessage && <Alert severity={setDefaultSeverity} onClose={() => setSetDefaultMessage("")}>{setDefaultMessage}</Alert>}
            </Stack>
          )}
        </Card>
      </Box>
    </Box>
  );
}


