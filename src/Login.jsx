import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import Banner from "./pages/Banner";

export default function Login() {
  const [username, setUsername] = useState("yte");
  const [passwordInput, setPasswordInput] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !passwordInput.trim()) {
      alert("⚠️ Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    const userKey = username.toUpperCase();
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

      // Lưu thông tin đăng nhập
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("account", userKey);
      localStorage.setItem("loginRole", userKey.toLowerCase()); // ✅ Lưu role là chữ thường

      // Điều hướng theo quyền
      if (userKey === "ADMIN") {
        navigate("/admin");
      } else {
        let targetTab = "dulieu"; // mặc định YTE
        if (userKey === "KETOAN") targetTab = "thongke";
        else if (userKey === "BGH") targetTab = "danhsach";

        navigate("/quanly", {
          state: {
            account: userKey,
            tab: targetTab,
          },
        });
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
              {(username && username.toLowerCase() === "admin")
                ? "QUẢN TRỊ HỆ THỐNG"
                : "QUẢN LÝ BÁN TRÚ"}
            </Typography>


            <FormControl fullWidth>
              <InputLabel id="account-label">Loại tài khoản</InputLabel>
              <Select
                labelId="account-label"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                label="Loại tài khoản"
              >
                <MenuItem value="yte">🧾 Y tế</MenuItem>
                <MenuItem value="ketoan">💰 Kế toán</MenuItem>
                <MenuItem value="bgh">📋 BGH</MenuItem>
                <MenuItem value="admin">🔐 Admin</MenuItem>
              </Select>
            </FormControl>

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
                fontSize: "1rem",
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
