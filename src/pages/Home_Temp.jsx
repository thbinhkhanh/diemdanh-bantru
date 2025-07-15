import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import Banner from "./Banner";

export default function Home() {
  const navigate = useNavigate();
  const [useNewVersion, setUseNewVersion] = useState(false);

  useEffect(() => {
    const fetchToggle = async () => {
      try {
        const toggleSnap = await getDoc(doc(db, "SETTINGS", "TOGGLE"));
        if (toggleSnap.exists()) {
          setUseNewVersion(toggleSnap.data().useNewVersion === true);
        }
      } catch (error) {
        console.error("❌ Lỗi khi tải trạng thái toggle:", error);
      }
    };
    fetchToggle();
  }, []);

  const khốiList = ["KHỐI 1", "KHỐI 2", "KHỐI 3", "KHỐI 4", "KHỐI 5"];
  const imageList = ["L1.png", "L2.png", "L3.png", "L4.png", "L5.png"];
  const colorMap = ["#42a5f5", "#66bb6a", "#ffb300", "#ab47bc", "#ef5350"];

  // Lấy thông tin đăng nhập từ localStorage và chuẩn hóa viết hoa
  const account = (localStorage.getItem("account") || "").toUpperCase();
  const isClassAccount = /^[1-5]\.[1-6]$/.test(account);
  const userLop = isClassAccount ? parseInt(account.split(".")[0], 10) : null;
  const isSpecialAccount = ["YTE", "KETOAN", "BGH", "ADMIN"].includes(account);

  const handleAccess = (targetLop) => {
  const account = localStorage.getItem("account") || "";

  // ✅ Nếu là tài khoản lớp, giới hạn quyền
  if (/^[1-5]\.[1-6]$/.test(account)) {
    const userLop = parseInt(account.split(".")[0], 10);
    if (userLop === targetLop) {
      navigate(`/lop${targetLop}`, { state: { useNewVersion } });
    } else {
      alert("⛔ Bạn chỉ được phép truy cập lớp của mình!");
      navigate("/login");
    }
  } else {
    // ✅ Nếu là yte, admin, bgh, ketoan → không giới hạn
    navigate(`/lop${targetLop}`, { state: { useNewVersion } });
  }
};


  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
        py: 0,
        px: 0,
      }}
    >
      <Banner title="ĐIỂM DANH BÁN TRÚ" />

      <Box sx={{ px: 2 }}>
        <Grid container spacing={3} justifyContent="center" sx={{ mt: 3, mb: 4 }}>
          {khốiList.map((label, index) => {
            const lopTarget = index + 1;
            return (
              <Grid item xs={12} sm={6} md={4} key={label}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    elevation={4}
                    sx={{
                      borderRadius: 2,
                      overflow: "hidden",
                      textAlign: "center",
                      height: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: "#fff",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        p: 1.5,
                        cursor: "pointer",
                      }}
                      onClick={() => handleAccess(lopTarget)}
                    >
                      <img
                        src={`/${imageList[index]}`}
                        alt={label}
                        width="120px"
                        height="120px"
                        style={{
                          borderRadius: "8px",
                          boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
                        }}
                      />
                    </Box>

                    <CardContent sx={{ py: 1 }}>
                      <Typography
                        variant="h6"
                        fontWeight="600"
                        gutterBottom
                        sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                      >
                        Nhấn để xem danh sách lớp {index + 1}
                      </Typography>

                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          backgroundColor: colorMap[index],
                          fontWeight: 600,
                          py: { xs: 0.5, sm: 1 },
                          fontSize: { xs: "0.8rem", sm: "0.9rem" },
                          "&:hover": {
                            backgroundColor: colorMap[index],
                            filter: "brightness(0.9)",
                          },
                        }}
                        onClick={() => handleAccess(lopTarget)}
                      >
                        Vào {label}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
}
