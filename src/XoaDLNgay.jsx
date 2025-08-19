import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  MenuItem,
  Select,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Tooltip,
} from "@mui/material";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import vi from "date-fns/locale/vi";
import { useClassList } from "./context/ClassListContext";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,   // 👈 THÊM VÀO ĐÂY
  doc,
  deleteField,
  getDoc,
  setDoc 
} from "firebase/firestore";
import { db } from "./firebase";

export default function XoaDLNgay({ onBack }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [option, setOption] = useState("toantruong");
  const [selectedClass, setSelectedClass] = useState("");
  const [classList, setClassList] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [progressing, setProgressing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loginRole = localStorage.getItem("loginRole");
  const { getClassList, setClassListForKhoi } = useClassList();

  const canDelete =
    loginRole === "admin" ||
    (loginRole === "yte" &&
      (() => {
        const now = new Date();
        const s = selectedDate;
        return (
          s.getFullYear() > now.getFullYear() ||
          (s.getFullYear() === now.getFullYear() && s.getMonth() > now.getMonth()) ||
          (s.getFullYear() === now.getFullYear() &&
            s.getMonth() === now.getMonth() &&
            s.getDate() >= now.getDate())
        );
      })());

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
        const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

        if (!namHocValue) {
          setErrorMessage("❌ Không tìm thấy năm học hợp lệ trong hệ thống!");
          return;
        }

        // 🔍 Kiểm tra danh sách lớp từ context trước
        const cachedList = getClassList("TRUONG");
        if (cachedList.length > 0) {
          //console.log("📦 LẤY DANH SÁCH LỚP TỪ CONTEXT:", cachedList);
          setClassList(cachedList.sort());
          return;
        }

        // 📥 Nếu chưa có → tải từ Firestore
        const snapshot = await getDocs(collection(db, `CLASSLIST_${namHocValue}`));
        const truongDoc = snapshot.docs.find((doc) => doc.id === "TRUONG");
        const data = truongDoc?.data();

        if (data?.list && Array.isArray(data.list)) {
          const list = data.list.sort();
          //console.log("🗂️ LẤY DANH SÁCH LỚP TỪ FIRESTORE:", list);
          setClassList(list);
          setClassListForKhoi("TRUONG", list); // 🔁 Lưu vào context để dùng lại
        } else {
          console.warn("⚠️ Không tìm thấy danh sách lớp hợp lệ trong document TRUONG.");
        }
      } catch (error) {
        console.error("❌ Lỗi tải danh sách lớp:", error);
      }
    };

    fetchClasses();
  }, []);


  const formatDate = (date) =>
    date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const handleSubmit = () => {
    const dateStr = formatDate(selectedDate);
    const message =
      option === "toantruong"
        ? `Bạn muốn xóa dữ liệu toàn trường ngày ${dateStr}?`
        : `Bạn muốn xóa dữ liệu lớp ${selectedClass} ngày ${dateStr}?`;

    setConfirmMessage(message);
    setOpenConfirm(true);
  };

  const handleConfirm = async () => {
    setOpenConfirm(false);
    setShowSuccess(false);
    setProgressing(true);
    setProgressValue(0);

    const selectedDateStr = new Date(selectedDate.getTime() + 7 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    try {
      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

      if (!namHocValue) {
        setProgressing(false);
        setErrorMessage("❌ Không tìm thấy năm học hợp lệ trong hệ thống!");
        return;
      }

      const docRef = doc(db, `BANTRU_${namHocValue}`, selectedDateStr);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setProgressing(false);
        setResultMessage("⚠️ Không có dữ liệu nào để xoá.");
        return;
      }

      const data = docSnap.data();
      let danhSachAn = data.danhSachAn || [];

      if (option === "toantruong") {
        await deleteDoc(docRef);
        //console.log(`🗑️ Đã xoá toàn bộ dữ liệu ngày ${selectedDateStr}`);
        setResultMessage(`✅ Đã xoá toàn bộ dữ liệu ngày ${selectedDateStr}`);
      } else if (option === "chonlop") {
        const removedStudents = danhSachAn.filter(id => {
          const maLop = id.split("-")[0];
          return maLop === selectedClass;
        });

        const filteredList = danhSachAn.filter(id => {
          const maLop = id.split("-")[0];
          return maLop !== selectedClass;
        });

        await setDoc(docRef, {
          ...data,
          danhSachAn: filteredList,
        });

        //console.log(`🗑️ Đã xoá ${removedStudents.length} học sinh lớp ${selectedClass}:`);
        removedStudents.forEach(id => {
          //console.log(`— ${id}`);
        });

        setResultMessage(`✅ Đã xoá dữ liệu lớp ${selectedClass} ngày ${selectedDateStr}`);
      }

      setShowSuccess(true);
    } catch (error) {
      console.error("❌ Lỗi khi xoá dữ liệu:", error);
      setResultMessage("❌ Có lỗi xảy ra khi xoá dữ liệu. Vui lòng thử lại.");
    } finally {
      setProgressing(false);
    }
  };



  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 2, px: 1 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="h5" align="center" gutterBottom fontWeight="bold" color="primary">
          XÓA DỮ LIỆU
          <Box sx={{ height: "2px", width: "100%", backgroundColor: "#1976d2", borderRadius: 1, mt: 2, mb: 4 }} />
        </Typography>

        <Stack spacing={3} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <Box sx={{ width: 185 }}>
              <DatePicker
                label="Chọn ngày"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
              />
            </Box>
          </LocalizationProvider>

          <RadioGroup row value={option} onChange={(e) => setOption(e.target.value)}>
            <FormControlLabel value="toantruong" control={<Radio />} label="Toàn trường" />
            <FormControlLabel value="chonlop" control={<Radio />} label="Chọn lớp" />
          </RadioGroup>

          {option === "chonlop" && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={selectedClass}
                displayEmpty
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="" disabled>-- Chọn lớp --</MenuItem>
                {classList.map((cls) => (
                  <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (!canDelete) {
                setErrorMessage("❌ Bạn không có quyền xóa dữ liệu!");
                return;
              }
              setErrorMessage("");
              handleSubmit();
            }}
            startIcon={<DeleteIcon />}
            sx={{
              width: 160,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Thực hiện
          </Button>
        </Stack>

        {showSuccess && (
          <Alert severity="success" sx={{ mt: 2, mb: 0, textAlign: "center" }}>
            {resultMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2, mb: 0, textAlign: "center" }}>
            {errorMessage}
          </Alert>
        )}

        {progressing && (
          <Box sx={{ width: "50%", mt: 2, mx: "auto" }}>
            <LinearProgress variant="determinate" value={progressValue} />
            <Typography align="center">{Math.round(progressValue)}%</Typography>
          </Box>
        )}

        <Button onClick={onBack} color="secondary" fullWidth sx={{ mt: 2 }}>
          ⬅️ Quay lại
        </Button>
      </Paper>

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>Hủy</Button>
          <Button onClick={handleConfirm} color="primary">
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
