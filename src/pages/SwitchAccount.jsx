import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
//import { useClassList } from "../context/ClassListContext";
import { useTeacherAccount } from "../context/TeacherAccountContext";

const setSession = (userKey) => {
  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("account", userKey);
  localStorage.setItem("loginRole", userKey.toLowerCase());
  localStorage.setItem("isAdmin", "true");
  localStorage.setItem("rememberedAccount", userKey);
};

const CLASS_BY_KHOI = {
  K1: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"],
  K2: ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"],
  K3: ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"],
  K4: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
  K5: ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6"],
};

const KHOI_OPTIONS = [
  { value: "K1", label: "Khối 1" },
  { value: "K2", label: "Khối 2" },
  { value: "K3", label: "Khối 3" },
  { value: "K4", label: "Khối 4" },
  { value: "K5", label: "Khối 5" },
];

export default function SwitchAccount() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedKhoi, setSelectedKhoi] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const { teacherAccounts, setAccountsForKhoi } = useTeacherAccount();

  const navigate = useNavigate();

  const fetchTeacher = async (userKey) => {
    if (!/^([1-5])\.\d$/.test(userKey)) {
      setTeacherName("");
      return;
    }

    const khoiKey = `K${userKey.split(".")[0]}`;
    const cachedList = teacherAccounts[khoiKey] || [];

    const cachedTeacher = cachedList.find((item) => item.username === userKey);

    if (cachedTeacher && cachedTeacher.hoTen) {
      setTeacherName(cachedTeacher.hoTen);
      return;
    }

    try {
      const docSnap = await getDoc(doc(db, "ACCOUNT", userKey));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const hoTen = data?.hoTen || "";
        setTeacherName(hoTen);
        const khoiClassList = CLASS_BY_KHOI[khoiKey] || [];
        const enrichedList = await Promise.all(
          khoiClassList.map(async (className) => {
            const docRef = doc(db, "ACCOUNT", className);
            try {
              const snap = await getDoc(docRef);
              const accData = snap.exists() ? snap.data() : {};
              return {
                username: className,
                hoTen: accData?.hoTen || "",
                password: accData?.password || "",
                khoi: khoiKey,
              };
            } catch (err) {
              console.warn(`⚠️ Lỗi khi tải lớp '${className}':`, err);
              return {
                username: className,
                hoTen: "",
                password: "",
                khoi: khoiKey,
              };
            }
          })
        );
        setAccountsForKhoi(khoiKey, enrichedList);
      } else {
        setTeacherName("");
      }
    } catch (err) {
      console.error("🚨 Lỗi lấy tên giáo viên từ Firestore:", err);
      setTeacherName("");
    }
  };

  useEffect(() => {
    const current = localStorage.getItem("account")?.trim();

    if (current && /^\d\.\d$/.test(current)) {
      const khoi = "K" + current.split(".")[0];
      const classList = CLASS_BY_KHOI[khoi] || [];

      setSelectedKhoi(khoi);
      setAccounts(classList);
      setUsername(current); // ✅ Gán tài khoản đã đăng nhập làm username
      fetchTeacher(current);
    }
  }, []);

  // Cập nhật danh sách lớp khi đổi khối
  useEffect(() => {
    if (!selectedKhoi) {
      setAccounts([]);
      setUsername("");
      setTeacherName("");
      return;
    }

    const classList = CLASS_BY_KHOI[selectedKhoi] || [];
    setAccounts(classList);

    // Nếu username hiện tại không nằm trong danh sách lớp, thì KHÔNG thay đổi nó
    if (!classList.includes(username)) {
      // Nếu username chưa có thì cố gắng lấy lại từ localStorage
      const fromStorage = localStorage.getItem("account") || "";
      if (classList.includes(fromStorage)) {
        setUsername(fromStorage);
      } else {
        // fallback: chọn lớp đầu tiên
        setUsername(classList[0] || "");
      }
    }
  }, [selectedKhoi]);

  // Khi đổi lớp -> lấy lại tên giáo viên
  useEffect(() => {
    if (username) fetchTeacher(username);
  }, [username]);

  const handleSwitchAccount = async () => {
    const userKey = username?.toUpperCase().trim();
    const passwordInput = password.trim();

    if (!userKey || !passwordInput) {
      setMessage("⚠️ Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    const khoiKey = `K${userKey.split(".")[0]}`;
    const accountsInKhoi = teacherAccounts[khoiKey] || [];

    const matched = accountsInKhoi.find((acc) => acc.username === userKey);

    if (matched) {
      if (matched.password !== passwordInput) {
        setMessage("❌ Sai mật khẩu.");
        return;
      }

      setSession(userKey);
      setMessage("✅ Đăng nhập thành công.");

      setTimeout(() => {
        navigate(`/lop${khoiKey.slice(1)}`, { state: { lop: userKey } });
      }, 500);
      return;
    }

    // 🔁 Nếu chưa có trong context thì fetch từ Firestore và lưu lại
    try {
      const docSnap = await getDoc(doc(db, "ACCOUNT", userKey));
      if (!docSnap.exists()) {
        setMessage("❌ Tài khoản không tồn tại.");
        return;
      }

      const data = docSnap.data();
      if (data.password !== passwordInput) {
        setMessage("❌ Sai mật khẩu.");
        return;
      }

      const updatedAccount = {
        username: userKey,
        hoTen: data.hoTen || "",
        password: data.password || "",
        khoi: khoiKey,
      };

      // 👉 Lưu lại vào context
      const updatedKhoiList = [...accountsInKhoi, updatedAccount];
      setAccountsForKhoi(khoiKey, updatedKhoiList);

      setSession(userKey);
      setMessage("✅ Đăng nhập thành công.");

      setTimeout(() => {
        navigate(`/lop${khoiKey.slice(1)}`, { state: { lop: userKey } });
      }, 500);
    } catch (err) {
      console.error("🔥 Lỗi kết nối khi xác thực tài khoản:", err);
      setMessage("⚠️ Lỗi kết nối.");
    }
  };

  const handleCancel = () => {
    setUsername("");
    setPassword("");
    setMessage("");
    navigate(-1);
  };

  const currentAccount = localStorage.getItem("account") || "";

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", py: 4 }}>
      <Box sx={{ width: { xs: "95%", sm: 400 }, mx: "auto" }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔁</div>

            <Typography variant="h5" fontWeight="bold" textAlign="center" color="primary">
              CHUYỂN ĐỔI TÀI KHOẢN
            </Typography>

            <TextField
              label="👩‍🏫 Giáo viên"
              value={teacherName}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
            />

            <Stack direction="row" spacing={2} width="100%">
              <FormControl size="small" sx={{ width: "50%" }}>
                <InputLabel>🏫 Chọn khối</InputLabel>
                <Select
                  value={selectedKhoi}
                  label="🏫 Chọn khối"
                  onChange={(e) => setSelectedKhoi(e.target.value)}
                >
                  {KHOI_OPTIONS.map((k) => (
                    <MenuItem key={k.value} value={k.value}>
                      {k.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ width: "50%" }} disabled={accounts.length === 0}>
                <InputLabel>🧑 Chọn lớp</InputLabel>
                <Select
                  value={username}
                  label="🧑 Chọn lớp"
                  onChange={(e) => setUsername(e.target.value)}
                >
                  {accounts.map((acc) => (
                    <MenuItem key={acc} value={acc}>
                      {acc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="🔐 Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              size="small"
              onKeyDown={(e) => e.key === "Enter" && handleSwitchAccount()}
            />

            <Stack direction="row" spacing={2} width="100%">
              <Button
                variant="contained"
                color="primary"
                onClick={handleSwitchAccount}
                fullWidth
                sx={{ fontWeight: "bold", textTransform: "none", fontSize: "1rem" }}
              >
                ✅ Đăng nhập
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancel}
                fullWidth
                sx={{ fontWeight: "bold", textTransform: "none", fontSize: "1rem" }}
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
