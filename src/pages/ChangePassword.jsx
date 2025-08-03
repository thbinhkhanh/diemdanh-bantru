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

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedAccount = localStorage.getItem("account");
    if (storedAccount) {
      const username = storedAccount.toUpperCase();
      setUsername(username);

      const fetchUpdateDate = async () => {
        try {
          const userDocRef = doc(db, "ACCOUNT", username);
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
    try {
      const userDocRef = doc(db, "ACCOUNT", username);

      // 👉 Lấy ngày giờ hiện tại theo giờ Việt Nam, định dạng dd-mm-yyyy
      const now = new Date();
      const options = {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      };
      const vietnamDate = new Intl.DateTimeFormat("en-GB", options).format(now);
      const formattedDate = vietnamDate.replace(/\//g, "-");

      await updateDoc(userDocRef, {
        password: newPassword,
        date: formattedDate, // ✅ Lưu chuỗi dạng "02-08-2025"
      });
    } catch (error) {
      console.error("🔥 Lỗi cập nhật mật khẩu trên Firestore:", error);
      throw error;
    }
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

    try {
      const userDocRef = doc(db, "ACCOUNT", username);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        setMessage("❌ Tài khoản không tồn tại trên hệ thống.");
        return;
      }

      const currentPassword = docSnap.data().password || "";

      if (currentPassword !== oldPw) {
        setMessage("❌ Mật khẩu cũ không đúng.");
        return;
      }

      await updatePasswordInFirestore(username, newPw);

      setMessage("✅ Đổi mật khẩu thành công.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // 👉 Cập nhật lại ngày cuối sau khi đổi mật khẩu
      const now = new Date();
      const options = {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      };
      const formatted = new Intl.DateTimeFormat("en-GB", options)
        .format(now)
        .replace(/\//g, "-");
      setLastUpdated(formatted);
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

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", py: 4 }}>
      <Box sx={{ width: { xs: "95%", sm: 400 }, mx: "auto", mt: 0 }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔑</div>

            <Typography
              variant="h5"
              fontWeight="bold"
              textAlign="center"
              color="primary"
            >
              ĐỔI MẬT KHẨU
            </Typography>

            {username && (
              <>
                <Typography
                  variant="body1"
                  sx={{
                    color: "black",
                    textAlign: "center",
                    fontWeight: "bold",
                    mb: -1,
                  }}
                >
                  🧑 Tài khoản: {username}
                </Typography>

                {lastUpdated && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "gray",
                      fontStyle: "italic",
                      textAlign: "center",
                    }}
                  >
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
              <Button
                variant="contained"
                color="primary"
                onClick={handleChangePassword}
                fullWidth
                sx={{
                  fontWeight: "bold",
                  textTransform: "none",
                  fontSize: "1rem",
                }}
              >
                🔁 Cập nhật
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancel}
                fullWidth
                sx={{
                  fontWeight: "bold",
                  textTransform: "none",
                  fontSize: "1rem",
                }}
              >
                🔙 Quay lại
              </Button>
            </Stack>

            {message && (
              <Typography
                variant="body2"
                sx={{
                  color: message.startsWith("✅") ? "green" : "red",
                  mt: 1,
                  textAlign: "center",
                }}
              >
                {message}
              </Typography>
            )}
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
