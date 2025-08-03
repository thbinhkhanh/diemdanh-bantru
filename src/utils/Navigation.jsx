import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Menu, MenuItem, Typography, Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { navStyle, navStyleGroup } from '../utils/navStyle';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [showLogoPopup, setShowLogoPopup] = useState(false);
  const [activeNavPath, setActiveNavPath] = useState('/home');
  const [anchorElAccount, setAnchorElAccount] = useState(null);

  useEffect(() => {
    const mainPath = '/' + location.pathname.split('/')[1];
    setActiveNavPath(mainPath);
  }, [location.pathname]);

  useEffect(() => {
    const fetchYear = async () => {
      const ref = doc(db, 'YEAR', 'NAMHOC');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSelectedYear(snap.data().value || '2024-2025');
      } else {
        await setDoc(ref, { value: '2024-2025' });
        setSelectedYear('2024-2025');
      }
    };
    fetchYear();
  }, []);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    ['loggedIn', 'account', 'loginRole', 'redirectTarget', 'isAdmin', 'rememberedAccount'].forEach(k =>
      localStorage.removeItem(k)
    );
    window.location.href = '/home'; // hard reload
    //navigate('/home'); // ✅ chuyển trang mềm, không reload    
  };

  const handleProtectedNavigate = (path) => {
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const loginRole = localStorage.getItem('loginRole');
    const match = path.match(/^\/lop([1-5])$/);

    if (match) {
      const lopDuocChon = match[1];
      const isClassAccount = /^\d+\.\d+$/.test(loginRole);

      if (isLoggedIn) {
        if (isClassAccount) {
          const currentKhoi = loginRole.split('.')[0];
          if (lopDuocChon === currentKhoi) {
            setActiveNavPath(path);
            navigate(path);
          } else {
            // 🛠 Thêm delay tránh giật khi chuyển lớp
            setTimeout(() => {
              navigate('/login', {
                state: {
                  redirectTo: `/lop${lopDuocChon}`,
                  classId: `lop${lopDuocChon}`,
                  switchingClass: true,
                },
              });
            }, 300);
          }
          return;
        }

        setActiveNavPath(path);
        navigate(path);
        return;
      }

      // ❌ Nếu chưa đăng nhập ➜ đi login
      setTimeout(() => {
        navigate('/login', {
          state: {
            redirectTo: `/lop${lopDuocChon}`,
            classId: `lop${lopDuocChon}`,
          },
        });
      }, 300);
      return;
    }

    // 👉 Nếu vào trang quản lý
    if (path === '/quanly') {
      if (!isLoggedIn) {
        setTimeout(() => {
          navigate('/login', { state: { redirectTo: path } });
        }, 300);
        return;
      }

      const isClassAccount = /^\d+\.\d+$/.test(loginRole);
      if (path === '/quanly') {
        if (!isLoggedIn) {
          setTimeout(() => {
            navigate('/login', { state: { redirectTo: path } });
          }, 300);
          return;
        }

        const isClassAccount = /^\d+\.\d+$/.test(loginRole);
        if (isClassAccount) {
          // 👉 Không hỏi xác nhận nữa, chuyển thẳng đến Login
          navigate('/login', {
            state: {
              redirectTo: '/quanly',
              switchingClass: true, // đánh dấu là đang chuyển từ tài khoản lớp
            },
          });
          return;
        }

        setActiveNavPath(path);
        navigate(path);
        return;
      }

      setActiveNavPath(path);
      navigate(path);
      return;
    }

    // 👉 Các đường dẫn khác
    if (isLoggedIn) {
      setActiveNavPath(path);
      navigate(path);
    } else {
      setTimeout(() => {
        navigate('/login', { state: { redirectTo: path } });
      }, 300);
    }
  };

  const publicNavItems = [
    { path: '/home', name: 'Trang chủ', icon: <HomeIcon /> },
  ];

  const protectedNavItems = [
    { path: '/lop1', name: 'Khối 1' },
    { path: '/lop2', name: 'Khối 2' },
    { path: '/lop3', name: 'Khối 3' },
    { path: '/lop4', name: 'Khối 4' },
    { path: '/lop5', name: 'Khối 5' },
    { path: '/quanly', name: 'Quản lý' },
  ];

  return (
    <>
      {/* Popup logo fullscreen */}
      {showLogoPopup && (
        <div
          onClick={() => setShowLogoPopup(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            cursor: 'zoom-out',
          }}
        >
          <img
            src="/Logo.png"
            alt="Logo lớn"
            style={{
              maxWidth: '70%',
              maxHeight: '70%',
              borderRadius: '8px',
              boxShadow: '0 0 20px rgba(255,255,255,0.8)',
            }}
          />
        </div>
      )}

      {/* Navigation bar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '4px 8px',
        background: '#1976d2',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflowX: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch'
        }}>
          <img
            src="/Logo.png"
            alt="Logo"
            style={{ height: '35px', marginRight: '16px', cursor: 'pointer' }}
            onClick={() => setShowLogoPopup(true)}
          />

          {publicNavItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => {
                setActiveNavPath(item.path);
                navigate(item.path);
              }}
              style={{ ...navStyle(item.path, activeNavPath), minWidth: 'auto', padding: '6px' }}
            >
              {item.icon}
            </Button>
          ))}

          {protectedNavItems.map((item) => (
            <Button key={item.path} onClick={() => handleProtectedNavigate(item.path)} style={navStyle(item.path, activeNavPath)}>
              {item.name}
            </Button>
          ))}

          <Button
            onClick={(e) => {
              handleMenuOpen(e);
              if (location.pathname === '/login') {
                navigate('/home');
              }
            }}
            style={navStyleGroup(['/gioithieu', '/huongdan', '/chucnang'], location.pathname)}
          >
            Trợ giúp
          </Button>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleMenuClose}>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/huongdan'); }} sx={{ fontSize: '14px' }}>Hướng dẫn sử dụng</MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/chucnang'); }} sx={{ fontSize: '14px' }}>Giới thiệu chức năng</MenuItem>
          </Menu>

          {localStorage.getItem('loggedIn') === 'true' && (
            <>
              <Button onClick={(e) => setAnchorElAccount(e.currentTarget)} style={navStyle('/doimatkhau', location.pathname)}>
                Tài khoản
              </Button>
              <Menu anchorEl={anchorElAccount} open={Boolean(anchorElAccount)} onClose={() => setAnchorElAccount(null)}>
                <MenuItem
                  onClick={() => {
                    setAnchorElAccount(null);
                    const role = localStorage.getItem('loginRole');
                    if (['admin', 'yte', 'bgh', 'ketoan'].includes(role)) {
                      alert('🔒 Tài khoản quản lý không thể đổi mật khẩu tại đây.');
                      return;
                    }
                    navigate('/doimatkhau');
                  }}
                  disabled={['admin', 'yte', 'bgh', 'ketoan'].includes(localStorage.getItem('loginRole'))}
                  sx={{ fontSize: '14px' }}
                >
                  Đổi mật khẩu
                </MenuItem>

                <MenuItem onClick={() => { setAnchorElAccount(null); handleLogout(); }} sx={{ fontSize: '14px' }}>
                  Đăng xuất
                </MenuItem>
              </Menu>
            </>
          )}
        </div>

        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'white' }}>Năm học:</Typography>
          <Box sx={{
            backgroundColor: 'white',
            minWidth: 100,
            borderRadius: 1,
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography sx={{ color: 'black', fontWeight: 'bold', fontSize: '14px', padding: '6px 8px' }}>
              {selectedYear}
            </Typography>
          </Box>
        </Box>
      </nav>
    </>
  );
}
