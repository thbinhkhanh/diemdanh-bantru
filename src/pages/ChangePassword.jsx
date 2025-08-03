import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useTeacherAccount } from "../context/TeacherAccountContext"; // ✅ Import context

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const { teacherAccounts, setAccountsForKhoi } = useTeacherAccount(); // ✅
  const [countdown, setCountdown] = useState(null); // null hoặc số giây còn lại

  const navigate = useNavigate();

  useEffect(() => {
    const storedAccount = localStorage.getItem("account");
    if (storedAccount) {
      const uname = storedAccount.toUpperCase();
      setUsername(uname);

      const fetchUpdateDate = async () => {
        try {
          const userDocRef = doc(db, "ACCOUNT", uname);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const dateString = docSnap.data().date;
            if (dateString) {
              setLastUpdated(dateString);
            }
          }
        } catch (error) {
          console.error("❌ Lỗi khi lấy ngày cập nhật:", error);
        }
      };

      fetchUpdateDate();
    }
  }, []);

  const updatePasswordInFirestore = async (username, newPassword) => {
    const userDocRef = doc(db, "ACCOUNT", username);
    const now = new Date();
    const options = {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    const formattedDate = new Intl.DateTimeFormat("en-GB", options)
      .format(now)
      .replace(/\//g, "-");

    await updateDoc(userDocRef, {
      password: newPassword,
      date: formattedDate,
    });

    return formattedDate; // 🔁 Trả về để cập nhật UI
  };

  const handleChangePassword = async () => {
    const oldPw = oldPassword.trim();
    const newPw = newPassword.trim();
    const confirmPw = confirmPassword.trim();

    if (!username || !oldPw || !newPw || !confirmPw) {
      setMessage("⚠️ Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (newPw !== confirmPw) {
      setMessage("❌ Mật khẩu mới không khớp.");
      return;
    }

    const isLopAccount = /^([1-5])\.\d$/.test(username);
    const khoiKey = isLopAccount ? `K${username.split(".")[0]}` : null;

    try {
      let currentPassword = "";

      if (isLopAccount && teacherAccounts[khoiKey]) {
        // ✅ Lấy mật khẩu từ context nếu là tài khoản lớp
        const accList = teacherAccounts[khoiKey] || [];
        const matched = accList.find((acc) => acc.username === username);
        currentPassword = matched?.password || "";
      } else {
        // 🧾 Fallback với Firestore
        const docSnap = await getDoc(doc(db, "ACCOUNT", username));
        if (!docSnap.exists()) {
          setMessage("❌ Tài khoản không tồn tại trên hệ thống.");
          return;
        }
        currentPassword = docSnap.data().password || "";
      }

      if (currentPassword !== oldPw) {
        setMessage("❌ Mật khẩu cũ không đúng.");
        return;
      }

      // ✅ Cập nhật mật khẩu trên Firestore
      const updatedDate = await updatePasswordInFirestore(username, newPw);

      // 🔁 Nếu là tài khoản lớp, cập nhật lại context
      if (isLopAccount && teacherAccounts[khoiKey]) {
        const updatedAccounts = (teacherAccounts[khoiKey] || []).map((acc) =>
          acc.username === username
            ? { ...acc, password: newPw }
            : acc
        );
        setAccountsForKhoi(khoiKey, updatedAccounts);
      }

      setMessage("✅ Đổi mật khẩu thành công.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setLastUpdated(updatedDate);
    } catch (err) {
      console.error("🔥 Lỗi đổi mật khẩu:", err);
      setMessage("⚠️ Đã có lỗi xảy ra khi đổi mật khẩu.");
    }
  };

  const handleCancel = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    navigate(-1);
  };

  useEffect(() => {
    if (message.startsWith("✅")) {
      setCountdown(5); // ⏳ bắt đầu từ 3 giây
    }
  }, [message]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      navigate(-1); // 👈 quay lại
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000); // mỗi giây giảm 1

    return () => clearTimeout(timer); // dọn dẹp nếu unmount
  }, [countdown, navigate]);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", py: 4 }}>
      <Box sx={{ width: { xs: "95%", sm: 400 }, mx: "auto" }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔑</div>
            <Typography variant="h5" fontWeight="bold" textAlign="center" color="primary">
              ĐỔI MẬT KHẨU
            </Typography>

            {username && (
              <>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  🧑 Tài khoản: {username}
                </Typography>
                {lastUpdated && (
                  <Typography variant="body2" sx={{ color: "gray", fontStyle: "italic" }}>
                    🕒 Cập nhật lần cuối: {lastUpdated}
                  </Typography>
                )}
              </>
            )}

            <TextField
              label="🔒 Mật khẩu cũ"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="🆕 Mật khẩu mới"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="✅ Xác nhận mật khẩu"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            />

            <Stack direction="row" spacing={2} width="100%">
              <Button variant="contained" color="primary" onClick={handleChangePassword} fullWidth>
                🔁 Cập nhật
              </Button>
              <Button variant="outlined" color="secondary" onClick={handleCancel} fullWidth>
                🔙 Quay lại
              </Button>
            </Stack>

            {message && (
              <>
                <Typography
                  variant="body2"
                  sx={{
                    color: message.startsWith("✅") ? "green" : "red", // ✅ Màu theo trạng thái
                    mt: 1,
                    textAlign: "center",
                    fontSize: "0.95rem",
                  }}
                >
                  {message}
                </Typography>

                {message === "✅ Đổi mật khẩu thành công." && countdown !== null && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "red", // 🔴 Luôn đỏ cho dòng đếm ngược
                      textAlign: "center",
                      fontSize: "0.95rem",
                      mt: 0.5,
                    }}
                  >
                    ⏳ Trang sẽ quay lại sau {countdown} giây...
                  </Typography>
                )}
              </>
            )}
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
