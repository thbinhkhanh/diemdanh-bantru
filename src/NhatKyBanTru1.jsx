import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  useMediaQuery,
  LinearProgress,
  Button,
} from "@mui/material";
import { db } from "./firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useTheme } from "@mui/material";

export default function NhatKyBanTru({ onBack }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setDataList([]);

    try {
      const namHocDoc = await getDoc(doc(db, "YEAR", "NAMHOC"));
      const namHocValue = namHocDoc.exists() ? namHocDoc.data().value : null;

      if (!namHocValue) {
        console.error("❌ Không tìm thấy năm học hiện tại!");
        setIsLoading(false);
        return;
      }

      const nhatKyRef = collection(db, `NHATKYBANTRU_${namHocValue}`);
      const querySnapshot = await getDocs(nhatKyRef);

      const records = querySnapshot.docs
        .map((docSnap) => {
            const data = docSnap.data();
            return {
            id: docSnap.id,
            ...data,
            };
        })
        .sort((a, b) => {
            const dateA = new Date((a.ngayDieuChinh || "").replace(" ", "T"));
            const dateB = new Date((b.ngayDieuChinh || "").replace(" ", "T"));
            return dateB - dateA; // 🔁 Sắp xếp giảm dần theo ngày (gần nhất trước)
        });

      setDataList(records);
    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

const formatNgayDieuChinh = (raw) => {
if (!raw) return "Không rõ";
try {
    const date = new Date(raw.replace(" ", "T")); // đảm bảo đúng định dạng
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`; // 👉 Đúng thứ tự bạn muốn
} catch {
    return raw;
}
};

return (
    <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
        <Paper
            elevation={3}
            sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 2,
            width: "100%",
            maxWidth: "900px", // 📏 Tăng giới hạn chiều rộng
            }}
        >
            <Typography
            variant="h5"
            fontWeight="bold"
            align="center"
            color="primary"
            sx={{ mb: 4, borderBottom: "3px solid #1976d2", pb: 1 }}
            >
            LỊCH SỬ ĐĂNG KÝ
            </Typography>

            {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Box sx={{ width: "50%" }}>
                <LinearProgress />
                </Box>
            </Box>
            ) : (
            <>
                {isMobile ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dataList.length === 0 ? (
                    <Typography align="center" fontStyle="italic">
                        Không có dữ liệu phù hợp
                    </Typography>
                    ) : (
                    dataList.map((item, index) => (
                        <Paper
                        key={item.id || index}
                        elevation={2}
                        sx={{ p: 2, borderRadius: 2, borderLeft: "5px solid #1976d2" }}
                        >
                        <Typography fontWeight="bold" variant="subtitle1">
                            {index + 1}. {item.hoTen || item.hoVaTen || "Không rõ"}
                        </Typography>
                        <Typography>Lớp: {item.lop || ""}</Typography>
                        <Typography
                            sx={{
                            color: item.trangThai?.trim() === "Hủy đăng ký" ? "error.main" : "inherit"
                            }}
                        >
                            Trạng thái: {item.trangThai?.trim() || "Chưa rõ"}
                        </Typography>
                        <Typography>Ngày điều chỉnh: {formatNgayDieuChinh(item.ngayDieuChinh)}</Typography>
                        </Paper>
                    ))
                    )}
                </Box>
                ) : (
                <TableContainer component={Paper}>
                    <Table
                    sx={{
                        tableLayout: "fixed",
                        border: "1px solid #ccc",
                        borderCollapse: "collapse",
                        "& td, & th": {
                        border: "1px solid #ccc",
                        textAlign: "center",
                        padding: "10px 8px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        },
                        "& td.hoten": {
                        textAlign: "left",
                        },
                    }}
                    >
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#1976d2" }}>
                        <TableCell sx={{ width: 40, color: "#fff", fontWeight: "bold" }}>STT</TableCell>
                        <TableCell sx={{ width: 200, color: "#fff", fontWeight: "bold" }} align="left">
                            HỌ VÀ TÊN
                        </TableCell>
                        <TableCell sx={{ width: 40, color: "#fff", fontWeight: "bold" }}>LỚP</TableCell>
                        <TableCell sx={{ width: 100, color: "#fff", fontWeight: "bold" }}>TRẠNG THÁI</TableCell>
                        <TableCell sx={{ width: 140, color: "#fff", fontWeight: "bold" }}>NGÀY ĐIỀU CHỈNH</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {dataList.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} sx={{ fontStyle: "italic" }}>
                            Không có dữ liệu phù hợp
                            </TableCell>
                        </TableRow>
                        ) : (
                        dataList.map((item, index) => (
                            <TableRow key={item.id || index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="hoten">{item.hoTen || item.hoVaTen || "Không rõ"}</TableCell>
                            <TableCell>{item.lop || ""}</TableCell>
                            <TableCell
                                sx={{
                                color: item.trangThai?.trim() === "Hủy đăng ký" ? "error.main" : "inherit"
                                }}
                            >
                                {item.trangThai?.trim() || "Chưa rõ"}
                            </TableCell>
                            <TableCell>{formatNgayDieuChinh(item.ngayDieuChinh)}</TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </TableContainer>
                )}
            </>
            )}

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Button onClick={onBack} color="secondary">⬅️ Quay lại</Button>
            </Box>
        </Paper>
        </Box>

    );
}