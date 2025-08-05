import React from "react";
import {
  Typography,
  Container,
  Divider,
  Card,
  CardContent,
  Link,
  Box,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import TodayIcon from "@mui/icons-material/Today";
import EventNoteIcon from "@mui/icons-material/EventNote";

export default function About() {
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
          mt: { xs: "10px", sm: "10px" },
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
              GIỚI THIỆU CHỨC NĂNG
            </Typography>
            <Typography variant="body2">
              Dành cho cán bộ, giáo viên và phụ huynh
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
              variant="h5"
              align="center"
              fontWeight="bold"
              sx={{ mt: 0, mb: 2, color: "#1976d2" }}
            >
              ỨNG DỤNG QUẢN LÝ BÁN TRÚ - ĐIỂM DANH
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body1" paragraph>
              Ứng dụng được phát triển nhằm hỗ trợ giáo viên và nhà trường trong công tác quản lý học sinh bán trú, cập nhật số liệu chuyên cần, thực hiện thống kê – báo cáo một cách nhanh chóng và chính xác.
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>🧾 CHỨC NĂNG CHÍNH</Typography>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" alignItems="center" sx={{ mt: 3 }}>
                <TodayIcon sx={{ fontSize: 24, mr: 1, color: "#1976d2" }} />
                <Typography variant="h6" fontWeight="bold">ĐIỂM DANH</Typography>
              </Box>

              <Box sx={{ pl: 2 }}>

                <ul style={{ paddingLeft: '2rem' }}>
                  <li>✅ <strong>Điểm danh bán trú:</strong> Ghi nhận danh sách học sinh ăn bán trú trong ngày hiện tại.</li>
                  <li>🔄 <strong>Điểm danh chuyên cần:</strong> Ghi nhận tình trạng đi học, nghỉ có phép/không phép.</li>
                  <li>📆 <strong>Lịch sử điểm danh:</strong> Xem lại thông tin chuyên cần theo từng học sinh, từng ngày.</li>
                </ul>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box display="flex" alignItems="center" sx={{ mt: 3 }}>
              <EventNoteIcon sx={{ fontSize: 24, mr: 1, color: "#1976d2" }} />
              <Typography variant="h6" fontWeight="bold">QUẢN LÝ DỮ LIỆU NGÀY</Typography>
            </Box>

            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                📌 <strong>Chốt số liệu trong ngày</strong><br />
                <Box sx={{ pl: 2 }}>
                  • Ghi nhận danh sách học sinh ăn bán trú trong ngày hiện tại.<br />
                  • Tự động thống kê số liệu bán trú trong ngày theo lớp, khối, toàn trường.<br />
                </Box>
              </Typography>
              <Typography paragraph>
                📊 <strong>Số liệu trong ngày</strong><br />
                <Box sx={{ pl: 2 }}>
                  • Hiển thị nhanh:<br />
                  <Box sx={{ pl: 2 }}>
                    o 📍 Thống kê chuyên cần: nghỉ phép, nghỉ không phép theo ngày bất kì.<br />
                    o 🍽️ Thống kê số liệu bán trú theo ngày bất kì.<br />
                  </Box>
                  • Lọc theo lớp, khối, toàn trường.
                </Box>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>📖 NHẬT KÝ ĐIỂM DANH</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                🔍 <strong>Tra cứu lịch sử điểm danh chuyên cần:</strong><br />
                <Box sx={{ pl: 2 }}>
                  • Lọc dữ liệu theo ngày, tháng, năm và theo khối/lớp.<br />
                  • Hiển thị: họ tên học sinh, lớp, có phép/không phép, lý do vắng.<br />
                  • Hỗ trợ xuất báo cáo dưới dạng Excel.
                </Box>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>📅 THỐNG KÊ THEO THÁNG</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                • Lọc theo tháng và lớp.<br />
                • Thống kê tổng số buổi vắng (có phép/không phép) và chi tiết ngày vắng.<br />
                • Thống kê tổng số ngày ăn bán trú và chi tiết từng ngày.<br />
                • Hỗ trợ xuất báo cáo dưới dạng Excel.
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>📆 THỐNG KÊ THEO NĂM</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                • Lọc theo năm học và lớp học.<br />
                • Tổng hợp số buổi vắng (có phép/không phép) của từng học sinh theo tháng.<br />
                • Thống kê tổng số lần ăn bán trú của từng học sinh theo tháng.<br />
                • Hỗ trợ xuất báo cáo dưới dạng Excel.
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>🛠️ CHỈNH SỬA DỮ LIỆU</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                🔧 <strong>Điều chỉnh suất ăn bán trú</strong><br />
                <Box sx={{ pl: 2 }}>
                  • Sửa lại trạng thái đăng ký suất ăn bán trú ở bất kỳ ngày nào.<br />
                  • Hệ thống sẽ cập nhật bảng thống kê tự động.
                </Box>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>🗑️ XÓA DỮ LIỆU THEO NGÀY</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                • Cho phép xóa dữ liệu bán trú (cả lớp, toàn trường) đã chốt trong một ngày bất kỳ.<br />
                • Sau khi xóa, các thống kê tháng/năm sẽ tự động cập nhật.
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>📈 BÁO CÁO & THỐNG KÊ</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                • 🗓️ Theo ngày: Tổng hợp sĩ số và suất ăn theo từng lớp.<br />
                • 📅 Theo tháng: Chi tiết số ngày vắng và số ngày ăn bán trú.<br />
                • 📚 Theo năm: Thống kê tổng số ngày vắng và ăn bán trú của học sinh toàn trường.
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>👥 DANH SÁCH HỌC SINH</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                • 📥 Cập nhật danh sách: Thêm hoặc xoá học sinh bán trú.<br />
                • 📋 Lập danh sách đăng ký: Lập danh sách học sinh bán trú theo lớp.<br />
                • 📤 Tải danh sách: Nhập dữ liệu học sinh toàn trường từ file Excel.
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3 }}>🗄️ CƠ SỞ DỮ LIỆU</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography paragraph>
                • 📥 Sao lưu dữ liệu: Tải toàn bộ hệ thống về máy (.JSON / .Excel).<br />
                • 🔁 Phục hồi dữ liệu: Nhập lại dữ liệu từ bản sao lưu.<br />
                • 🗑️ Xóa toàn bộ dữ liệu: Làm trống toàn hệ thống điểm danh/bán trú.<br />
                • 🆕 Khởi tạo năm học mới: Tạo dữ liệu mới, tạo tài khoản lớp (không xoá dữ liệu cũ).<br />
                • 📂 Xem dữ liệu cũ: Truy cập lại thông tin điểm danh, bán trú của các năm trước.
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Typography variant="body1" paragraph>
              📩 Góp ý, phản hồi:{" "}
              <Link href="mailto:thbinhkhanh@gmail.com" color="primary" underline="hover">
                thbinhkhanh@gmail.com
              </Link>
            </Typography>
            <Typography variant="body2" align="left" color="text.secondary">
              📅 Phiên bản: 2.0.0<br />
              🛠️ Cập nhật lần cuối: 01/08/2025
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 3 }}>
              © 2025 – Trường Tiểu học Bình Khánh
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
