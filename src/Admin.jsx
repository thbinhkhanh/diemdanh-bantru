import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, TextField, Button, Stack,
  Card, Divider, Select, MenuItem, FormControl, InputLabel,
  RadioGroup, Radio, FormControlLabel, LinearProgress, Alert,
  Tabs, Tab, Checkbox, FormGroup
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import Banner from "./pages/Banner";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { writeBatch } from "firebase/firestore";
import { deleteField, doc, getDoc, setDoc } from "firebase/firestore";
import { useClassData } from "./context/ClassDataContext";

// 🧠 Import logic đã tách
import { xoaDatabase } from "./utils/xoaDatabase";
import { resetBanTru } from "./utils/resetBanTru";
import { resetDiemDanh } from "./utils/resetDiemDanh";
import { updateTeacherNamesFromFile } from "./utils/excelHandlers";
import { createClassUserAccounts, resetClassUserPasswords } from "./utils/accountUtils";

import {
  downloadBackupAsJSON,
  downloadBackupAsExcel,
} from "./utils/backupUtils";
import {
  restoreFromJSONFile,
  restoreFromExcelFile,
} from "./utils/restoreUtils";


// ✅ Component phụ hiển thị tiến trình
const ResetProgressText = ({ label, progress }) => (
  <Typography variant="caption" align="center" display="block" mt={0.5}>
    {label}... {progress}%
  </Typography>
);

export default function Admin({ onCancel }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { getClassData, setClassData } = useClassData();

  // 🔧 State chung
  const [selectedYear, setSelectedYear] = useState("2024-2025");
  const [tabIndex, setTabIndex] = useState(0);
  const yearOptions = [
    "2024-2025", "2025-2026", "2026-2027", "2027-2028", "2028-2029"
  ];
  const [firestoreEnabled, setFirestoreEnabled] = useState(false);

  // 📦 Tài khoản
  const [passwords, setPasswords] = useState({ yte: "", ketoan: "", bgh: "", admin: "" });
  const [newPassword, setNewPassword] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("admin");

  // 🗑️ Xóa dữ liệu
  const [deleteCollections, setDeleteCollections] = useState({
    danhsach: false, bantru: false, diemdan: false,
    nhatkybantru: false, xoaHocSinhBanTru: false
  });
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [defaultProgress, setDefaultProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deletingLabel, setDeletingLabel] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteSeverity, setDeleteSeverity] = useState("info");
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [defaultMessage, setDefaultMessage] = useState("");
  const [defaultSeverity, setDefaultSeverity] = useState("info");

  // ♻️ Reset dữ liệu
  const [resetProgress, setResetProgress] = useState(0);
  const [resetMessage, setResetMessage] = useState("");
  const [resetSeverity, setResetSeverity] = useState("info");
  const [resetType, setResetType] = useState("");

  // 💾 Sao lưu/phục hồi
  const [backupFormat, setBackupFormat] = useState("json");
  const [selectedDataTypes, setSelectedDataTypes] = useState({
    danhsach: false, bantru: false, diemdan: false, nhatky: false
  });
  const [selectedBackupFile, setSelectedBackupFile] = useState(null);
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [showRestoreOptions, setShowRestoreOptions] = useState(false);
  const [restoreMode, setRestoreMode] = useState("all");
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("info");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info"); // "success", "error", "warning", "info"

  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [customUserPassword, setCustomUserPassword] = useState("");
  const [actionType, setActionType] = useState(""); // "create" | "reset" | ""
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showCreateDatabase, setShowCreateDatabase] = useState(false);
  const [updateTeacherName, setUpdateTeacherName] = useState(false);
  const [teacherProgress, setTeacherProgress] = useState(0);
    
  const [options, setOptions] = useState({
    list: false,
    meal: false,
    attendance: false,
    log: false
  });


  // 🛠️ Xử lý form chọn
  const handleDeleteCheckboxChange = (key) => {
    setDeleteCollections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const handleCheckboxChange = (key) => {
    setSelectedDataTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 🔁 Xử lý logic gọi hàm tách riêng
  const handlePerformDelete = async () => {
    await xoaDatabase({
      selectedYear,
      deleteCollections,
      setDeleting,
      setProgress,
      setDeletingLabel,
      setDeleteMessage,
      setDeleteSeverity,
      setDeleteSuccess,
      setShowDeleteOptions,
      setDeleteCollections,
    });
  };

  const handleResetDangKyBanTru = async () => {
    await resetBanTru({
      setResetProgress,
      setResetMessage,
      setResetSeverity,
      setResetType,
      setClassData,
      getClassData,
    });
  };

  const handleResetDiemDanh = async () => {
    await resetDiemDanh({
      setResetProgress,
      setResetMessage,
      setResetSeverity,
      setResetType,
    });
  };

  const handleBackupData = () => {
    const isEmpty = Object.values(selectedDataTypes).every((v) => !v);
    if (isEmpty) return alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để sao lưu.");
    backupFormat === "json"
      ? downloadBackupAsJSON(selectedDataTypes)
      : downloadBackupAsExcel(selectedDataTypes);
    setShowBackupOptions(false);
  };

  const handleRestoreData = () => {
    const isEmpty = Object.values(selectedDataTypes).every((v) => !v);
    if (isEmpty) return alert("⚠️ Vui lòng chọn ít nhất một loại dữ liệu để phục hồi.");
    if (!selectedBackupFile) return alert("❌ Chưa chọn file phục hồi.");

    const restoreFn = backupFormat === "json" ? restoreFromJSONFile : restoreFromExcelFile;
    restoreFn(
      selectedBackupFile, setRestoreProgress, setAlertMessage,
      setAlertSeverity, selectedDataTypes, restoreMode
    );

    setShowRestoreOptions(false);
    setSelectedBackupFile(null);
  };

  // 🧠 Tải cấu hình ban đầu
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const accounts = ["admin", "yte", "ketoan", "bgh"];
        const passwords = {};
        for (const acc of accounts) {
          const snap = await getDoc(doc(db, "ACCOUNT", acc.toUpperCase()));
          passwords[acc] = snap.exists() ? snap.data().password || "" : "";
        }
        setPasswords(passwords);

        const yearSnap = await getDoc(doc(db, "YEAR", "NAMHOC"));
        if (yearSnap.exists()) setSelectedYear(yearSnap.data().value || "2024-2025");

        const toggleSnap = await getDoc(doc(db, "SETTINGS", "TAIDULIEU"));
        if (toggleSnap.exists()) setFirestoreEnabled(toggleSnap.data().theokhoi);
      } catch (error) {
        console.error("❌ Lỗi khi tải cấu hình:", error);
      }
    };
    fetchConfig();
  }, []);

  // ⌛ Tiện ích phụ
  useEffect(() => {
    if (restoreProgress === 100) setTimeout(() => setRestoreProgress(0), 3000);
  }, [restoreProgress]);

  const handleYearChange = async (newYear) => {
    setSelectedYear(newYear);
    await setDoc(doc(db, "YEAR", "NAMHOC"), { value: newYear });
  };

  const handleToggleChange = async (e) => {
    const newValue = e.target.value === "khoi";
    setFirestoreEnabled(newValue);
    await setDoc(doc(db, "SETTINGS", "TAIDULIEU"), { theokhoi: newValue });
  };

  const handleChangePassword = async (type) => {
    if (!newPassword.trim()) return alert("⚠️ Vui lòng nhập mật khẩu mới!");
    await setDoc(doc(db, "ACCOUNT", type.toUpperCase()), { password: newPassword }, { merge: true });
    setPasswords((prev) => ({ ...prev, [type]: newPassword }));
    alert(`✅ Đã đổi mật khẩu cho ${type.toUpperCase()}!`);
    setNewPassword("");
  };

  //Tạo dữ liệu năm học mới

  const createNewYearData = async (options) => {
    const confirmed = window.confirm(`⚠️ Bạn có chắc muốn khởi tạo dữ liệu cho năm ${selectedYear}?`);
    if (!confirmed) return;

    try {
      // Tạo collection DANHSACH nếu được chọn
      if (options.list) {
        await setDoc(doc(db, `DANHSACH_${selectedYear}`, ""), {});
      }

      // Tạo collection BANTRU nếu được chọn
      if (options.meal) {
        await setDoc(doc(db, `BANTRU_${selectedYear}`, ""), {});
      }

      // Tạo collection DIEMDANH nếu được chọn
      if (options.attendance) {
        await setDoc(doc(db, `DIEMDANH_${selectedYear}`, ""), {});
      }

      // Tạo collection NHATKYBANTRU nếu được chọn
      if (options.log) {
        await setDoc(doc(db, `NHATKYBANTRU_${selectedYear}`, ""), {});
      }

      alert(`✅ Đã khởi tạo dữ liệu cho năm học ${selectedYear}`);
    } catch (err) {
      console.error("❌ Lỗi khi khởi tạo dữ liệu:", err);
      alert("❌ Không thể khởi tạo dữ liệu năm mới!");
    }
  };


  const [namHoc, setNamHoc] = useState('');
  useEffect(() => {
    const fetchNamHoc = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'YEAR', 'NAMHOC'));
        if (docSnap.exists()) {
          setNamHoc(docSnap.data().value || 'UNKNOWN');
        }
      } catch (err) {
        console.error('Lỗi khi tải năm học:', err.message);
        setNamHoc('UNKNOWN');
      }
    };
    fetchNamHoc();
  }, []);

  //Tạo tài khoản người dùng
  const handleCreateAccounts = async (customPassword) => {
    await createClassUserAccounts({
      db,
      password: customPassword,
      namHoc,
      setActionType,
      setProgress,
      setMessage,
      setSeverity,
    });
  };

  const handleResetPasswords = async (customPassword) => {
    await resetClassUserPasswords({
      db,
      password: customPassword,
      namHoc,
      setActionType,
      setProgress,
      setMessage,
      setSeverity,
    });
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
              <Divider>
                <Typography fontWeight="bold">👤 Database & Account</Typography>
              </Divider>

              {/* Nút tạo tài khoản người dùng */}
              {!showResetPassword && !showCreateDatabase && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setShowCreatePassword(true);
                    setShowResetPassword(false);
                    setShowCreateDatabase(false);
                    setCustomUserPassword("");
                  }}
                >
                  🆕 TÀI KHOẢN NGƯỜI DÙNG
                </Button>
              )}

              {/* Nhóm tạo tài khoản hoặc cập nhật giáo viên */}
              {showCreatePassword && (
                <>
                  <TextField
                    label="🔑 Nhập mật khẩu tài khoản"
                    type="password"
                    value={customUserPassword}
                    size="small"
                    onChange={(e) => setCustomUserPassword(e.target.value)}
                    fullWidth
                    sx={{ mb: 1 }}
                  />

                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <input
                      type="checkbox"
                      checked={updateTeacherName}
                      onChange={(e) => setUpdateTeacherName(e.target.checked)}
                      style={{ marginRight: 8 }}
                      id="updateTeacherName"
                    />
                    <label htmlFor="updateTeacherName">Cập nhật danh sách giáo viên</label>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      color={updateTeacherName ? "primary" : "success"}
                      sx={{ flex: 63 }}
                      onClick={async () => {
                        if (updateTeacherName) {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".xlsx, .xls";
                          input.onchange = async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            const confirmed = window.confirm("⚠️ Bạn có chắc muốn cập nhật tên giáo viên vào tài khoản?");
                            if (!confirmed) return;

                            setActionType("update");
                            await updateTeacherNamesFromFile(file, setTeacherProgress, setMessage, setSeverity, setUpdateTeacherName);
                            //setShowCreatePassword(false);
                            setCustomUserPassword("");
                            //setUpdateTeacherName(false);
                          };
                          input.click();
                        } else {
                          const confirmed = window.confirm("⚠️ Bạn có chắc muốn tạo tài khoản cho toàn bộ lớp?");
                          if (!confirmed) return;

                          setActionType("create");
                          await handleCreateAccounts(customUserPassword);
                          setShowCreatePassword(false);
                          setCustomUserPassword("");
                          setUpdateTeacherName(false);
                        }
                      }}
                    >
                      {updateTeacherName ? "📤 CẬP NHẬT" : "✅ TẠO TÀI KHOẢN"}
                    </Button>

                    <Button
                      variant="outlined"
                      color="secondary"
                      sx={{
                        flex: 35,
                        fontWeight: "bold",
                        textTransform: "none",
                        fontSize: "1rem"
                      }}
                      onClick={() => {
                        setShowCreatePassword(false);
                        setCustomUserPassword("");
                        setUpdateTeacherName(false);
                      }}
                    >
                      ❌ HỦY
                    </Button>
                  </Box>
                </>
              )}

              {/* Nút reset mật khẩu */}
              {!showCreatePassword && !showCreateDatabase && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setShowResetPassword(true);
                    setShowCreatePassword(false);
                    setShowCreateDatabase(false);
                    setCustomUserPassword("");
                  }}
                >
                  🔁 RESET MẬT KHẨU
                </Button>
              )}

              {/* Nhóm reset mật khẩu */}
              {showResetPassword && (
                <>
                  <TextField
                    label="🔑 Nhập mật khẩu mới"
                    type="password"
                    value={customUserPassword}
                    size="small"
                    onChange={(e) => setCustomUserPassword(e.target.value)}
                  />

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      sx={{ width: "50%" }}
                      onClick={async () => {
                        const confirmed = window.confirm("⚠️ Bạn có chắc muốn reset mật khẩu cho toàn bộ lớp?");
                        if (!confirmed) return;

                        setActionType("reset");                        
                        await handleResetPasswords(customUserPassword);
                        setShowResetPassword(false);
                        setCustomUserPassword("");
                      }}
                    >
                      🔁 RESET
                    </Button>

                    <Button
                      variant="outlined"
                      color="secondary"
                      sx={{
                        width: "50%",
                        fontWeight: "bold",
                        textTransform: "none",
                        fontSize: "1rem"
                      }}
                      onClick={() => {
                        setShowResetPassword(false);
                        setCustomUserPassword("");
                      }}
                    >
                      ❌ HỦY
                    </Button>
                  </Box>
                </>
              )}

              {/* Nút Tạo Database Năm Mới */}
              {!showCreatePassword && !showResetPassword && !showCreateDatabase && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setShowCreateDatabase(true);
                    setShowCreatePassword(false);
                    setShowResetPassword(false);
                  }}
                >
                  🆕 TẠO DATABASE NĂM MỚI
                </Button>
              )}

              {/* Nhóm tạo database */}
              {showCreateDatabase && (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      bgcolor: "#1976d2",
                      color: "#fff",
                      px: 2,
                      py: 1.2,
                      borderRadius: 1,
                      fontSize: "0.9375rem",
                      boxShadow: 1,
                      justifyContent: "flex-start",
                    }}
                  >
                    <span role="img" aria-label="new" style={{ marginRight: 8 }}>
                      🆕
                    </span>
                    TẠO DATABASE NĂM MỚI
                  </Box>

                  <Stack spacing={2} mt={2}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={options.list}
                            onChange={(e) => setOptions((prev) => ({ ...prev, list: e.target.checked }))}
                          />
                        }
                        label="Danh sách"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={options.meal}
                            onChange={(e) => setOptions((prev) => ({ ...prev, meal: e.target.checked }))}
                          />
                        }
                        label="Bán trú"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={options.attendance}
                            onChange={(e) => setOptions((prev) => ({ ...prev, attendance: e.target.checked }))}
                          />
                        }
                        label="Điểm danh"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={options.log}
                            onChange={(e) => setOptions((prev) => ({ ...prev, log: e.target.checked }))}
                          />
                        }
                        label="Nhật ký"
                      />
                    </FormGroup>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        sx={{ flex: 63 }}
                        onClick={async () => {
                          const { list, meal, attendance, log } = options;

                          if (!list && !meal && !attendance && !log) {
                            alert("⚠️ Vui lòng chọn ít nhất một mục để tạo database!");
                            return;
                          }

                          const confirmed = window.confirm("⚠️ Bạn có chắc muốn tạo dữ liệu năm mới?");
                          if (!confirmed) return;

                          await createNewYearData(options);
                          setShowCreateDatabase(false);
                          setOptions({ list: false, meal: false, attendance: false, log: false });
                        }}
                      >
                        ✅ TẠO DATABASE
                      </Button>

                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => {
                          setShowCreateDatabase(false);
                          setOptions({ list: false, meal: false, attendance: false, log: false });
                          setShowCreatePassword(false);
                          setShowResetPassword(false);
                        }}
                        sx={{
                          flex: 35,
                          fontWeight: "bold",
                          textTransform: "none",
                          fontSize: "1rem",
                        }}
                      >
                        ❌ HỦY
                      </Button>
                    </Box>
                  </Stack>
                </>
              )}

              {/* Nút chuyển đến danh sách tài khoản */}
              {!showCreatePassword && !showResetPassword && !showCreateDatabase && (
                <Button variant="contained" color="info" onClick={() => navigate("/accounts")}>
                  📋 DANH SÁCH TÀI KHOẢN
                </Button>
              )}

              {/* Tiến trình tạo/reset tài khoản */}
              {progress > 0 && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" align="center" display="block" mt={0.5}>
                    {actionType === "create"
                      ? `Đang tạo tài khoản... ${progress}%`
                      : actionType === "reset"
                      ? `Đang reset mật khẩu... ${progress}%`
                      : ""}
                  </Typography>
                </Box>
              )}

              {/* Tiến trình cập nhật giáo viên */}
              {teacherProgress > 0 && teacherProgress < 100 && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={teacherProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" align="center" display="block" mt={0.5}>
                    Đang cập nhật giáo viên... {teacherProgress}%
                  </Typography>
                </Box>
              )}

              {/* Thông báo */}
              {message && (
                <Alert severity={severity} onClose={() => setMessage("")} sx={{ mb: 2 }}>
                  {message}
                </Alert>
              )}
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
                    setSelectedDataTypes({ danhsach: false, bantru: false, diemdan: false, nhatky: false });
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
                    setSelectedDataTypes({ danhsach: false, bantru: false, diemdan: false, nhatky: false });
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
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.nhatky} onChange={() => handleCheckboxChange("nhatky")} />}
                      label="Nhật ký"
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
                          !selectedDataTypes.diemdan &&
                          !selectedDataTypes.nhatky;

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
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      sx={{
                        width: "50%",              // giữ nguyên nếu bạn muốn chiếm 50% chiều ngang
                        fontWeight: "bold",
                        textTransform: "none",
                        fontSize: "1rem"
                      }}
                      onClick={() => {
                        setShowBackupOptions(false);
                        setSelectedDataTypes({
                          danhsach: false,
                          bantru: false,
                          diemdan: false,
                          nhatky: false
                        });
                      }}
                    >
                      ❌ HỦY
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
                    <FormControlLabel
                      control={<Checkbox checked={selectedDataTypes.nhatky} onChange={() => handleCheckboxChange("nhatky")} />}
                      label="Nhật ký"
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
                          !selectedDataTypes.diemdan &&
                          !selectedDataTypes.nhatky;

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
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      sx={{
                        width: "50%",
                        fontWeight: "bold",
                        textTransform: "none",
                        fontSize: "1rem"
                      }}
                      onClick={() => {
                        setShowRestoreOptions(false);
                        setSelectedBackupFile(null);
                        setSelectedDataTypes({
                          danhsach: false,
                          bantru: false,
                          diemdan: false,
                          nhatky: false
                        });
                      }}
                    >
                      ❌ HỦY
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
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      sx={{
                        width: "50%",
                        fontWeight: "bold",
                        textTransform: "none",
                        fontSize: "1rem"
                      }}
                      onClick={() => {
                        setShowDeleteOptions(false);
                        setDeleteCollections({
                          danhsach: false,
                          bantru: false,
                          diemdan: false,
                          nhatkybantru: false,
                          xoaHocSinhBanTru: false
                        });
                      }}
                    >
                      ❌ HỦY
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
              {(deleteProgress > 0 || defaultProgress > 0) && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={deleteProgress || defaultProgress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" align="center" display="block" mt={0.5}>
                    {deleteProgress > 0
                      ? `Đang xóa dữ liệu bán trú... ${deleteProgress}%`
                      : `Đang reset legacy... ${defaultProgress}%`}
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

              {defaultMessage && (
                <Alert
                  severity={["info", "success", "error", "warning"].includes(defaultSeverity) ? defaultSeverity : "info"}
                  onClose={() => setDefaultMessage("")}
                >
                  {defaultMessage}
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


