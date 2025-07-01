import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card
} from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import Banner from "./pages/Banner";

export default function Login() {
  const [username, setUsername] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !passwordInput.trim()) {
      alert("⚠️ Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    const userKey = username.trim().toUpperCase();
    const docRef = doc(db, "ACCOUNT", userKey);

    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        alert("❌ Tài khoản không tồn tại.");
        return;
      }

      const data = docSnap.data();
      if (data.password !== passwordInput) {
        alert("❌ Sai mật khẩu.");
        return;
      }

      // ✅ Đăng nhập thành công
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("account", userKey);

      if (userKey === "ADMIN") {
        localStorage.setItem("userClass", "admin");
        navigate("/admin");
      } else {
        const classNumber = userKey.split(".")[0]; // "1.4" => "1"
        localStorage.setItem("userClass", classNumber);

        const allowedPath = `/lop${classNumber}`;
        navigate(allowedPath, {
          state: { account: userKey }
        });

        // ⚠️ Tùy chọn reload để chắc chắn bảo vệ route hoạt động
        window.location.reload();
      }
    } catch (error) {
      console.error("🔥 Lỗi đăng nhập:", error);
      alert("⚠️ Lỗi kết nối. Vui lòng thử lại.");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd" }}>
      <Banner title="ĐĂNG NHẬP HỆ THỐNG" />
      <Box sx={{ width: { xs: "95%", sm: 400 }, mx: "auto", mt: 4 }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔐</div>

            <Typography
              variant="h5"
              fontWeight="bold"
              color="primary"
              textAlign="center"
            >
              QUẢN TRỊ HỆ THỐNG
            </Typography>

            <TextField
              label="👤 Tài khoản"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />

            <TextField
              label="🔐 Mật khẩu"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              fullWidth
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
              fullWidth
              sx={{
                fontWeight: "bold",
                textTransform: "none",
                fontSize: "1rem"
              }}
            >
              🔐 Đăng nhập
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
