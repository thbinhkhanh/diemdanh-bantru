// 📁 src/utils/Navigation_Route.js
import { useNavigate } from 'react-router-dom';

/**
 * Điều hướng có kiểm tra đăng nhập và phân quyền truy cập.
 * @param {string} path - Đường dẫn cần chuyển đến (VD: "/lop2", "/quanly")
 * @param {function} navigate - Hàm điều hướng từ useNavigate()
 * @param {function} [setActiveNavPath] - Hàm cập nhật trạng thái đường dẫn đang chọn (optional)
 */
export const Navigation_Route = (path, navigate, setActiveNavPath) => {
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
  const loginRole = localStorage.getItem('loginRole');
  const match = path.match(/^\/lop([1-5])$/); // kiểm tra nếu là route lớp

  // 👉 Trường hợp: đường dẫn tới lớp cụ thể
  if (match) {
    const targetClass = match[1]; // "1", "2", ...
    const isClassAccount = /^\d+\.\d+$/.test(loginRole);

    if (isLoggedIn) {
      // ✅ Nếu tài khoản lớp -> kiểm tra đúng lớp mới cho vào
      if (isClassAccount) {
        const userClass = loginRole.split('.')[0];
        if (userClass === targetClass) {
          setActiveNavPath?.(path);
          navigate(path);
        } else {
          navigate('/login', {
            state: {
              redirectTo: `/lop${targetClass}`,
              classId: `lop${targetClass}`,
              switchingClass: true,
            },
          });
        }
        return;
      }

      // ✅ Nếu tài khoản quản lý -> cho vào bất kỳ lớp nào
      setActiveNavPath?.(path);
      navigate(path);
      return;
    }

    // ❌ Chưa đăng nhập -> redirect login
    navigate('/login', {
      state: {
        redirectTo: `/lop${targetClass}`,
        classId: `lop${targetClass}`,
      },
    });
    return;
  }

  // 👉 Trường hợp: truy cập trang quản lý
  if (path === '/quanly') {
    if (!isLoggedIn) {
      navigate('/login', { state: { redirectTo: path } });
      return;
    }

    if (/^\d+\.\d+$/.test(loginRole)) {
      alert('⚠️ Tài khoản lớp không được truy cập chức năng Quản lý. Hãy đăng xuất trước!');
      return;
    }

    setActiveNavPath?.(path);
    navigate(path);
    return;
  }

  // 👉 Trường hợp khác: Trang công khai hoặc có quyền
  if (isLoggedIn) {
    setActiveNavPath?.(path);
    navigate(path);
  } else {
    navigate('/login', { state: { redirectTo: path } });
  }
};



