// utils/isGioDiemDanh.js

/**
 * Kiểm tra xem hiện tại có trong giờ điểm danh (7:00 - 15:00 giờ Việt Nam)
 * @returns {boolean} true nếu trong giờ điểm danh, false nếu ngoài giờ
 */
export const isGioDiemDanh = () => {
  const now = new Date();
  const vnHours = (now.getUTCHours() + 7) % 24; // UTC+7
  return vnHours >= 7 && vnHours < 15; // 7:00 - 14:59
};
