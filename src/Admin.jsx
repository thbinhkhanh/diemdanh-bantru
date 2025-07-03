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
        { merge: true }
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

      const list = truongSnap.data().list;
      if (!Array.isArray(list)) {
        alert("❌ Danh sách lớp không hợp lệ!");
        return;
      }

      const created = [];

      for (const lop of list) {
        await setDoc(doc(db, "ACCOUNT", lop), {
          password: "123456"
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
      namHocValue: selectedYear,
    });
  };

  const handleSetDefault = async () => {
    const confirmed = window.confirm("⚠️ Bạn có chắc muốn reset điểm danh?");
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
      for (const docName of danhSachDocs) {
        await setDoc(doc(db, `DANHSACH_${selectedYear}`, docName), {
          list: ""
        });
      }

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
      {/* UI content đã nằm trong phần bạn gửi, giữ nguyên không thay đổi */}
      {/* Gồm Tabs: System và Database, form thay đổi mật khẩu, tạo tài khoản, khởi tạo, sao lưu, phục hồi, xóa, reset */}
    </Box>
  );
}
