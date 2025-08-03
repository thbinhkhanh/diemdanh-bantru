import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Card, Button
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AccountList() {
  const [accounts, setAccounts] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'ACCOUNT'));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setAccounts(data);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu ACCOUNT:", error);
      }
    };

    fetchAccounts();
  }, []);

  const roleLabels = {
    yte: "Y TẾ",
    ketoan: "KẾ TOÁN",
    bgh: "BGH",
    admin: "ADMIN",
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0, backgroundColor: '#e3f2fd', minHeight: '100vh' }}>
      <Card
        sx={{
          mt: 4,
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: 700,
          width: '100%',
          borderRadius: 4,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          backgroundColor: 'white',
        }}
        elevation={10}
      >
        <Typography
          variant="h5"
          align="center"
          color="primary"
          sx={{ mb: 4, borderBottom: '3px solid #1976d2', pb: 1, fontWeight: 'bold' }}
        >
          DANH SÁCH TÀI KHOẢN
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small" sx={{ border: '1px solid #ccc' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1976d2' }}>
                {['STT', 'HỌ VÀ TÊN', 'TÀI KHOẢN', 'MẬT KHẨU', 'NGÀY CẬP NHẬT'].map((label, idx) => (
                  <TableCell key={idx} align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
                {accounts.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ fontStyle: 'italic' }}>
                        Không có tài khoản nào
                    </TableCell>
                    </TableRow>
                ) : (
                    accounts.map((item, index) => {
                    const username = item.username || "";
                    const isManager = ['yte', 'ketoan', 'bgh', 'admin'].includes(username.toLowerCase());
                    const displayName = roleLabels[username.toLowerCase()] || username;
                    const lastUpdate = item.date || "—";

                    const classKey = username.split(".")[0]; // "1" từ "1.1"
                    const classNumber = parseInt(classKey, 10);
                    const isEvenClass = !isNaN(classNumber) && classNumber % 2 === 0;

                    const backgroundColor = isManager
                        ? "#fffde7" // màu quản lý
                        : isEvenClass
                        ? "#e1f5fe" // xanh nhạt cho khối chẵn
                        : "#ffffff"; // trắng cho khối lẻ

                    return (
                        <TableRow key={item.id} sx={{ backgroundColor }}>
                            <TableCell align="center">{index + 1}</TableCell>
                            <TableCell
                                align="left"
                                sx={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 180, // tuỳ chỉnh độ rộng tối đa nếu cần
                                }}
                                >
                                {item.hoTen || "—"}
                                </TableCell>

                            <TableCell align="center">{displayName}</TableCell>
                            <TableCell align="center">{item.password}</TableCell>
                            <TableCell align="center">{lastUpdate}</TableCell>
                        </TableRow>
                    );
                    })
                )}
                </TableBody>

          </Table>
        </TableContainer>

        {/* Nút Quay lại */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            onClick={() => {
              const selectedClass = location.state?.lop;
              const selectedLop = selectedClass?.split('.')[0];
              if (selectedLop) {
                navigate(`/lop${selectedLop}`, { state: { lop: selectedClass } });
              } else {
                navigate('/admin'); // fallback nếu không có thông tin lớp
              }
            }}
            color="secondary"
          >
            ⬅️ Quay lại
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
