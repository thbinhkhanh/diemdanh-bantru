import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
  useNavigate
} from 'react-router-dom';

import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';

import { getDoc, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

import Home from './pages/Home';
import Lop1 from './pages/Lop1';
import Lop2 from './pages/Lop2';
import Lop3 from './pages/Lop3';
import Lop4 from './pages/Lop4';
import Lop5 from './pages/Lop5';
import QuanLy from './pages/QuanLy';
import About from './pages/About';
import Footer from './pages/Footer';
import HuongDan from './pages/HuongDan';
import Login from './Login';
import NhatKyGV from "./NhatKyGV";
import { ClassDataProvider } from './context/ClassDataContext';


const Admin = lazy(() => import('./Admin'));

function PrivateRoute({ children }) {
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ClassDataProvider> {/* 🟢 Thêm dòng này */}
      <Router>
        <Navigation />
        <div style={{ paddingTop: 0 }}>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />

            {/* Các route yêu cầu đăng nhập */}
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/lop1" element={<PrivateRoute><Lop1 /></PrivateRoute>} />
            <Route path="/lop2" element={<PrivateRoute><Lop2 /></PrivateRoute>} />
            <Route path="/lop3" element={<PrivateRoute><Lop3 /></PrivateRoute>} />
            <Route path="/lop4" element={<PrivateRoute><Lop4 /></PrivateRoute>} />
            <Route path="/lop5" element={<PrivateRoute><Lop5 /></PrivateRoute>} />
            <Route path="/quanly" element={<PrivateRoute><QuanLy /></PrivateRoute>} />
            <Route path="/nhatky" element={<PrivateRoute><NhatKyGV /></PrivateRoute>} />

            {/* Trang quản lý dùng lazy load */}
            <Route
              path="/admin"
              element={
                <Suspense fallback={<div>Đang tải trang quản lý...</div>}>
                  <PrivateRoute>
                    <Admin />
                  </PrivateRoute>
                </Suspense>
              }
            />

            {/* Các trang không cần đăng nhập */}
            <Route path="/gioithieu" element={<About />} />
            <Route path="/huongdan" element={<HuongDan />} />
            <Route path="/chucnang" element={<About />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </ClassDataProvider> // 🟢 Kết thúc bọc context
  );
}

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const fetchYear = async () => {
      try {
        const docRef = doc(db, 'YEAR', 'NAMHOC');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSelectedYear(data?.value || '2024-2025');
        } else {
          await setDoc(docRef, { value: '2024-2025' });
          setSelectedYear('2024-2025');
        }
      } catch (error) {
        console.error('Lỗi đọc năm học từ Firestore:', error);
      }
    };
    fetchYear();
  }, []);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleClickQuanLy = () => {
    navigate('/login'); // ✅ Luôn đi đến trang login
  };

  const navItems = [
    { path: '/home', name: 'Trang chủ' },
    { path: '/lop1', name: 'Lớp 1' },
    { path: '/lop2', name: 'Lớp 2' },
    { path: '/lop3', name: 'Lớp 3' },
    { path: '/lop4', name: 'Lớp 4' },
    { path: '/lop5', name: 'Lớp 5' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '12px',
        background: '#1976d2',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          paddingRight: '8px',
          whiteSpace: 'nowrap',
        }}
      >
        <img
          src="/Logo.png"
          alt="Logo"
          style={{ height: '40px', marginRight: '16px', flexShrink: 0 }}
        />
        {navItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 12px',
              backgroundColor:
                location.pathname === item.path ? '#1565c0' : 'transparent',
              borderBottom:
                location.pathname === item.path ? '3px solid white' : 'none',
              borderRadius: '4px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </Link>
        ))}

        {/* Nút Quản lý → Luôn đi đến Login */}
        <Button
          onClick={handleClickQuanLy}
          style={{
            color: 'white',
            padding: '8px 12px',
            backgroundColor:
              location.pathname === '/quanly' ? '#1565c0' : 'transparent',
            borderBottom:
              location.pathname === '/quanly' ? '3px solid white' : 'none',
            borderRadius: '4px',
            textTransform: 'none',
          }}
        >
          Quản lý
        </Button>

        {/* Dropdown Trợ giúp */}
        <Button
          onClick={handleMenuOpen}
          style={{
            color: 'white',
            padding: '8px 12px',
            backgroundColor:
              location.pathname.includes('/gioithieu') ||
              location.pathname.includes('/huongdan') ||
              location.pathname.includes('/chucnang')
                ? '#1565c0'
                : 'transparent',
            borderBottom:
              location.pathname.includes('/gioithieu') ||
              location.pathname.includes('/huongdan') ||
              location.pathname.includes('/chucnang')
                ? '3px solid white'
                : 'none',
            borderRadius: '4px',
            textTransform: 'none',
          }}
        >
          Trợ giúp
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem component={Link} to="/huongdan" onClick={handleMenuClose}>
            Hướng dẫn sử dụng
          </MenuItem>
          <MenuItem component={Link} to="/chucnang" onClick={handleMenuClose}>
            Giới thiệu chức năng
          </MenuItem>
        </Menu>
      </div>

      {/* Góc phải hiển thị năm học */}
      <Box
        sx={{
          display: {
            xs: 'none',
            sm: 'flex',
          },
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
          Năm học:
        </Typography>
        <Box
          sx={{
            backgroundColor: 'white',
            minWidth: 100,
            maxWidth: 100,
            borderRadius: 1,
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #c4c4c4',
          }}
        >
          <Typography
            sx={{
              color: '#1976d2',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'center',
              padding: '6px 8px',
              width: '100%',
            }}
          >
            {selectedYear}
          </Typography>
        </Box>
      </Box>
    </nav>
  );
}

export default App;
