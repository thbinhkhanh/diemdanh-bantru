import React, { useState } from "react";
import {
  Typography,
  Container,
  Divider,
  Card,
  CardContent,
  Box,
  Button,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

const GroupDetails = ({ items, groupKey }) => {
  const [openIndex, setOpenIndex] = useState(0); // Mở mục đầu tiên

  return (
  <>
    {items.map((item, index) => (
      <details
        key={`${groupKey}-${index}`}
        open={openIndex === index}
        onToggle={(e) => {
          if (e.target.open) {
            setOpenIndex(index); // Khi mở thì đóng các mục khác
          }
        }}
      >
        <summary>{item.title}</summary>
        <div>{item.content}</div>
      </details>
    ))}
  </>
);
};

export default function HuongDan() {
  const [openKey, setOpenKey] = useState(null);

  const handleToggle = (key) => {
    setOpenKey((prevKey) => (prevKey === key ? null : key));
  };

  const renderItem = (key, title, content) => (
    <Box key={key} sx={{ mb: 2 }}>
      <Box
        onClick={() => handleToggle(key)}
        sx={{
          cursor: "pointer",
          fontWeight: "bold",
          py: 1,
          px: 2,
          borderRadius: 1,
          backgroundColor: openKey === key ? "#bbdefb" : "#e3f2fd",
          ":hover": { backgroundColor: "#90caf9" },
        }}
      >
        {title}
      </Box>
      {openKey === key && (
        <Box sx={{ px: 2, py: 1 }}>
          {content}
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
        py: 0,
        px: 0,
      }}
    >
      <Container
        sx={{
          mt: { xs: '64px', sm: '70px' },
          width: { xs: "98%", sm: "90%", md: "850px" },
        }}
      >
        <Box
          sx={{
            backgroundColor: "#2196f3",
            color: "#fff",
            borderRadius: 2,
            py: 2,
            px: 3,
            display: "flex",
            alignItems: "center",
          }}
        >
          <InfoIcon sx={{ fontSize: 32, mr: 1 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              HƯỚNG DẪN SỬ DỤNG
            </Typography>
            <Typography variant="body2">
              Hướng dẫn thao tác với hình ảnh minh họa
            </Typography>
          </Box>
        </Box>
      </Container>

      <Container
        sx={{
          mt: 3,
          mb: 4,
          width: { xs: "98%", sm: "90%", md: "850px" },
          mx: "auto",
        }}
      >
        <Card elevation={3} sx={{ borderRadius: 3, p: 2 }}>
          <CardContent>
            <Typography
              variant="h6"
              color="primary"
              fontWeight="bold"
              align="center"
              sx={{
                mb: 2,
                fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
              }}
            >
              ỨNG DỤNG QUẢN LÝ BÁN TRÚ
            </Typography>

            <Divider sx={{ my: 2 }} />

            <div>
              {renderItem("0", "📝 0. Điểm danh bán trú", (
                <ul>
                  <li>
                    B1: Tại Trang chủ, chọn biểu tượng lớp hoặc chọn lớp từ menu theo khối.<br />
                    <img src="/images/H0_B1.png" alt="B1" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }} />
                  </li>
                  <li>
                    B2: Hệ thống hiển thị danh sách học sinh.<br />
                    <img src="/images/H0_B2.png" alt="B2" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }} />
                  </li>
                  <li>B3: Tick học sinh để đánh dấu có ăn bán trú.</li>
                  <li>👉 Mọi thay đổi được tự động lưu.</li>
                </ul>
              ))}

              {renderItem("1", "🗓️ 1. Quản lý dữ liệu ngày", (
                <GroupDetails
                  groupKey="group-1"
                  items={[
                    {
                      title: "📌 1.1 Chốt số liệu",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Y tế</b><br /><img src="/images/H11_B1.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B3: Chọn biểu tượng <b>Chốt số liệu</b><br /><img src="/images/H11_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn ngày cần chốt</li>
                          <li>B5: Nhấn <b>Cập nhật</b> để chốt<br /><img src="/images/H11_B5.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                        </ul>
                      )
                    },
                    {
                      title: "📊 1.2 Số liệu trong ngày",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Y tế</b></li>
                          <li>B3: Chọn biểu tượng <b>Số liệu trong ngày</b><br /><img src="/images/H11_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                        </ul>
                      )
                    },
                    {
                      title: "🛠️ 1.3 Điều chỉnh suất ăn",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Y tế</b></li>
                          <li>B3: Chọn biểu tượng <b>Điều chỉnh suất ăn</b><br /><img src="/images/H11_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn lớp</li>
                          <li>B5: Chọn ngày<br /><img src="/images/H13_B4.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B6: Tick học sinh và <b>Cập nhật</b></li>
                        </ul>
                      )
                    },
                    {
                      title: "🗑️ 1.4 Xóa dữ liệu theo ngày",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Y tế</b></li>
                          <li>B3: Chọn biểu tượng <b>Xóa dữ liệu ngày</b><br /><img src="/images/H11_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn ngày cần xóa</li>                          
                          <li>B5: Chọn xóa <b>Toàn trường </b>hay <b>Chọn lớp</b> bất kỳ, nhấn <b>Thực hiện</b><br /><img src="/images/H24_B5.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                        </ul>
                      )
                    }
                  ]}
                />
              ))}

              {renderItem("2", "📈 2. Thống kê", (
                <GroupDetails
                  groupKey="group-2"
                  items={[
                    {
                      title: "🗓️ 2.1 Thống kê theo ngày",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>                          
                          <li>B2: Đăng nhập bằng tài khoản<b>Kế toán</b><br /><img src="/images/H21_B2.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B3: Chọn biểu tượng<b>Thống kê ngày</b><br /><img src="/images/H21_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn ngày<br /><img src="/images/H21_B4.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B5: Xem tổng hợp</li>
                        </ul>
                      )
                    },
                    {
                      title: "📊 2.2 Chi tiết từng tháng",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Kế toán</b></li>
                          <li>B3: Chọn biểu tượng <b>Chi tiết tháng</b><br /><img src="/images/H21_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>                          
                          <li>B4: Chọn tháng và lớp<br /><img src="/images/H22_B4.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>                          
                          <li>B5: Nhấn <b>Hiện ngày</b> để xem chi tiết</li>
                        </ul>
                      )
                    },
                    {
                      title: "📚 2.3 Tổng hợp cả năm",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Kế toán</b></li>
                          <li>B3: Chọn biểu tượng <b>Tổng hợp năm</b><br /><img src="/images/H21_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn năm học và lớp<br /><img src="/images/H23_B4.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B5: Nhấn <b>Hiện tháng</b> để xem chi tiết</li>
                        </ul>
                      )
                    }
                  ]}
                />
              ))}

              {renderItem("3", "👥 3. Danh sách học sinh", (
                <GroupDetails
                  groupKey="group-3"
                  items={[
                    {
                      title: "📅 3.1 Cập nhật danh sách",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>                          
                          <li>B2: Đăng nhập bằng tài khoản<b>BGH</b><br /><img src="/images/H31_B2.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B3: Chọn biểu tượng <b>Cập nhật danh sách</b><br /><img src="/images/H31_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn lớp, tên học sinh, trạng thái đăng ký<br /><img src="/images/H31_B4.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B5: Nhấn <b>Cập nhật</b></li>
                        </ul>
                      )
                    },
                    {
                      title: "📋 3.2 Lập danh sách",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>BGH</b></li>
                          <li>B3: Chọn biểu tượng <b>Lập danh sách lớp</b><br /><img src="/images/H31_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Vào lớp tương ứng</li>
                          <li>B5: Tick chọn học sinh đăng ký<br /><img src="/images/H32_B5.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B6: Nhấn <b>Lưu</b></li>
                        </ul>
                      )
                    },
                    {
                      title: "📄 3.3 Tải danh sách lên",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>BGH</b></li>
                          <li>B3: Chuẩn bị file Excel theo mẫu</li>
                          <li>B4: Chọn biểu tượng <b>Tải danh sách lên</b><br /><img src="/images/H31_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>                          
                          <li>B5: Chọn biểu tượng <b>Chọn file Excel</b><br /><img src="/images/H33_B5.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B6: Chọn file danh sách và <b>Tải lên</b> hệ thống</li>
                        </ul>
                      )
                    }
                  ]}
                />
              ))}

              {renderItem("4", "🗄️ 4. Cơ sở dữ liệu", (
                <GroupDetails
                  groupKey="group-4"
                  items={[
                    {
                      title: "📅 4.1 Sao lưu",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>                          
                          <li>B2: Đăng nhập bằng tài khoản<b>Admin</b><br /><img src="/images/H41_B2.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B3: Vào tab <b>Database</b><br /><img src="/images/H41_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn định dạng (JSON/Excel) </li>
                          <li>B5: Nhấn <b>Sao lưu</b></li>
                        </ul>
                      )
                    },
                    {
                      title: "🔁 4.2 Phục hồi",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Admin</b></li>
                          <li>B3: Vào tab <b>Database</b><br /><img src="/images/H41_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn <b>Phục hồi</b> và tìm đến tệp đã sao lưu</li>
                          <li>B5: Xác nhận phục hồi</li>
                        </ul>
                      )
                    },
                    {
                      title: "🗑️ 4.3 Xóa toàn bộ",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Admin</b></li>
                          <li>B3: Vào tab <b>Database</b><br /><img src="/images/H41_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn <b>Xóa Database Firestore</b></li>
                          <li>B5: Nhập mật khẩu (nếu được yêu cầu) để xác nhận</li>
                        </ul>
                      )
                    },
                    {
                      title: "🆕 4.4 Khởi tạo năm mới",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Admin</b></li>
                          <li>B3: Vào tab <b>System</b></li>
                          <li>B4: Chọn <b>Khởi tạo dữ liệu năm mới</b><br /><img src="/images/H44_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                        </ul>
                      )
                    },
                    {
                      title: "📂 4.5 Xem dữ liệu năm trước",
                      content: (
                        <ul>
                          <li>B1: Chọn menu <b>Quản lý</b></li>
                          <li>B2: Đăng nhập bằng tài khoản <b>Admin</b></li>
                          <li>B3: Chọn năm học cần xem tại tab <b>System</b><br /><img src="/images/H44_B3.png" alt="" style={{ width: "100%", maxWidth: "480px", height: "auto", display: "block", margin: "0 auto" }}  /></li>
                          <li>B4: Chọn <b>Hệ thống quản lý bán trú</b> để xem dữ liệu</li>
                        </ul>
                      )
                    }
                  ]}
                />
              ))}

            </div>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
