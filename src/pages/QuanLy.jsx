import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
} from '@mui/material';

// Icons
import LockIcon from '@mui/icons-material/Lock';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import TimelineIcon from '@mui/icons-material/Timeline';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StorageIcon from '@mui/icons-material/Storage';
import InsightsIcon from '@mui/icons-material/Insights';

// Components
import ChotSoLieu from '../ChotSoLieu';
import SoLieuNgay from '../SoLieuNgay';
import DieuChinhSuatAn from '../DieuChinhSuatAn';
import XoaDLNgay from '../XoaDLNgay';
import ThongkeNgay from '../ThongKeNgay';
import ThongkeThang from '../ThongKeThang';
import ThongkeNam from '../ThongKeNam';
import CapNhatDS from '../CapNhatDS';
import LapDanhSach from '../LapDanhSach';
import TaiDanhSach from '../TaiDanhSach';
import ThongKeNgay_DiemDanh from '../ThongKeNgay_DiemDanh';
import ThongKeThang_DiemDanh from '../ThongKeThang_DiemDanh';
import ThongKeNam_DiemDanh from '../ThongKeNam_DiemDanh';
import NhatKyDiemDanh from '../NhatKyDiemDanh';
import Banner from './Banner';

export default function QuanLy() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginRole = localStorage.getItem('loginRole')?.toUpperCase();
  const tabFromLogin = location.state?.tab || '';

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('loggedIn');
    const user = localStorage.getItem('loginRole');
    if (!isLoggedIn || !user) {
      navigate('/');
    }
  }, [navigate]);

  const defaultTabIndex =
    tabFromLogin === 'dulieu' ? 0 :
    tabFromLogin === 'thongke' ? 1 :
    tabFromLogin === 'diemdanh' ? 2 :
    tabFromLogin === 'danhsach' ? 3 :
    loginRole === 'YTE' ? 0 :
    loginRole === 'KETOAN' ? 1 :
    3;

  const [tabIndex, setTabIndex] = useState(defaultTabIndex);
  const [selectedFunction, setSelectedFunction] = useState('');

  const handleChange = (event, newValue) => {
    const isQuanTriTab = loginRole === 'ADMIN' && newValue === tabs.length - 1;
    if (isQuanTriTab) {
      navigate('/admin');
    } else {
      setTabIndex(newValue);
    }
  };

  const handleFunctionSelect = (code) => {
    if (code === 'ADMIN') {
      navigate('/admin');
    } else {
      setSelectedFunction(code);
    }
  };

  const renderSelectedFunction = () => {
    switch (selectedFunction) {
      case 'CHOT': return <ChotSoLieu onBack={() => setSelectedFunction('')} />;
      case 'SONGAY': return <SoLieuNgay onBack={() => setSelectedFunction('')} />;
      case 'SUATAN': return <DieuChinhSuatAn onBack={() => setSelectedFunction('')} />;
      case 'XOANGAY': return <XoaDLNgay onBack={() => setSelectedFunction('')} />;
      case 'TKNGAY': return <ThongkeNgay onBack={() => setSelectedFunction('')} />;
      case 'TKTHANG': return <ThongkeThang onBack={() => setSelectedFunction('')} />;
      case 'TKNAM': return <ThongkeNam onBack={() => setSelectedFunction('')} />;
      case 'DDNGAY': return <ThongKeNgay_DiemDanh onBack={() => setSelectedFunction('')} />;
      case 'DDTHANG': return <ThongKeThang_DiemDanh onBack={() => setSelectedFunction('')} />;
      case 'DDNAM': return <ThongKeNam_DiemDanh onBack={() => setSelectedFunction('')} />;
      case 'NHATKY': return <NhatKyDiemDanh onBack={() => setSelectedFunction('')} />;
      case 'CAPNHAT': return <CapNhatDS onBack={() => setSelectedFunction('')} />;
      case 'LAPDS': return <LapDanhSach onBack={() => setSelectedFunction('')} />;
      case 'TAIDS': return <TaiDanhSach onBack={() => setSelectedFunction('')} />;
      default: return null;
    }
  };

  const tabs = [
    {
      label: 'DỮ LIỆU',
      functions: [
        { code: 'CHOT', label: 'CHỐT SỐ LIỆU', icon: <LockIcon fontSize="large" />, color: '#1976d2' },
        { code: 'SONGAY', label: 'SỐ LIỆU TRONG NGÀY', icon: <CalendarTodayIcon fontSize="large" />, color: '#388e3c' },
        { code: 'SUATAN', label: 'ĐIỀU CHỈNH SUẤT ĂN', icon: <PlaylistAddCheckIcon fontSize="large" />, color: '#f57c00' },
        { code: 'XOANGAY', label: 'XOÁ DỮ LIỆU NGÀY', icon: <DeleteIcon fontSize="large" />, color: '#d32f2f' },
      ],
    },
    {
      label: 'BÁN TRÚ',
      functions: [
        { code: 'TKNGAY', label: 'THỐNG KÊ NGÀY', icon: <BarChartIcon fontSize="large" />, color: '#7b1fa2' },
        { code: 'TKTHANG', label: 'CHI TIẾT THÁNG', icon: <QueryStatsIcon fontSize="large" />, color: '#0097a7' },
        { code: 'TKNAM', label: 'TỔNG HỢP NĂM', icon: <TimelineIcon fontSize="large" />, color: '#1976d2' },
      ],
    },
    {
      label: 'ĐIỂM DANH',
      functions: [
        { code: 'DDNGAY', label: 'ĐIỂM DANH NGÀY', icon: <BarChartIcon fontSize="large" />, color: '#7b1fa2' },
        { code: 'DDTHANG', label: 'ĐIỂM DANH THÁNG', icon: <QueryStatsIcon fontSize="large" />, color: '#0097a7' },
        { code: 'DDNAM', label: 'ĐIỂM DANH NĂM', icon: <TimelineIcon fontSize="large" />, color: '#1976d2' },
        { code: 'NHATKY', label: 'NHẬT KÝ', icon: <InsightsIcon fontSize="large" />, color: '#ff6f00' },
      ],
    },
    {
      label: 'DANH SÁCH',
      functions: [
        { code: 'CAPNHAT', label: 'CẬP NHẬT DANH SÁCH', icon: <ManageAccountsIcon fontSize="large" />, color: '#303f9f' },
        { code: 'LAPDS', label: 'LẬP DANH SÁCH LỚP', icon: <FormatListBulletedIcon fontSize="large" />, color: '#c2185b' },
        { code: 'TAIDS', label: 'TẢI DANH SÁCH LÊN', icon: <FileUploadIcon fontSize="large" />, color: '#00796b' },
      ],
    },
  ];

  if (loginRole === 'ADMIN') {
    tabs.push({
      label: 'QUẢN TRỊ',
      functions: [
        { code: 'ADMIN', label: 'TRANG QUẢN TRỊ', icon: <AdminPanelSettingsIcon fontSize="large" />, color: '#512da8' },
      ],
    });
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#d0e4f7' }}>
      <Banner title="HỆ THỐNG QUẢN LÝ" />
      <Box sx={{ px: 2, pt: 2 }}>
        {selectedFunction ? (
          <Box maxWidth={700} mx="auto">{renderSelectedFunction()}</Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Tabs
                value={tabIndex}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ '.MuiTab-root': { minWidth: 120 } }}
              >
                {tabs.map((tab, index) => (
                  <Tab
                    key={index}
                    icon={index === 0 ? <StorageIcon fontSize="large" /> : tab.functions[0].icon}
                    iconPosition="top"
                    label={
                      <Typography fontWeight={600} sx={{ fontSize: '14px' }}>
                        {tab.label}
                      </Typography>
                    }
                  />
                ))}
              </Tabs>
            </Box>

            <Grid container spacing={3} justifyContent="center">
              {tabs[tabIndex].functions.map((func) => (
                <Grid item key={func.code}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Card
                      sx={{
                        width: 180,
                        height: 270,
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'center',
                        p: 2,
                      }}
                    >
                      <Box
                        sx={{
                          mt: 2,
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          backgroundColor: `${func.color}22`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease-in-out',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                        onClick={() => handleFunctionSelect(func.code)}
                      >
                        <Box sx={{ color: func.color, fontSize: 50 }}>{func.icon}</Box>
                      </Box>

                      <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
                          {func.label.toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Nhấn để truy cập
                        </Typography>
                      </Box>

                      <Button
                        variant="contained"
                        onClick={() => handleFunctionSelect(func.code)}
                        sx={{
                          mt: 2,
                          width: '100%',
                          fontWeight: 700,
                          borderRadius: 1,
                          textTransform: 'uppercase',
                          backgroundColor: func.color,
                          mb: 2,
                          '&:hover': {
                            backgroundColor: func.color,
                            filter: 'brightness(0.9)',
                          },
                          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        Vào
                      </Button>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Box>
    </Box>
  );
}
