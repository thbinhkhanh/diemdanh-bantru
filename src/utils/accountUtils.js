// src/utils/accountUtils.js
import { doc, getDoc, writeBatch, deleteField } from "firebase/firestore";

// Hàm tạo tài khoản
export const createClassUserAccounts = async ({
  db,
  password,
  namHoc,
  setActionType,
  setProgress,
  setMessage,
  setSeverity,
}) => {
  if (!password || password.trim() === "") {
    alert("❌ Vui lòng nhập mật khẩu hợp lệ!");
    return;
  }

  if (!namHoc || namHoc === "UNKNOWN") {
    alert("❌ Không có năm học hợp lệ!");
    return;
  }

  try {
    setActionType("create");
    setProgress(0);

    const truongRef = doc(db, `CLASSLIST_${namHoc}`, "TRUONG");
    const truongSnap = await getDoc(truongRef);

    if (!truongSnap.exists()) {
      setMessage("❌ Không tìm thấy document TRUONG.");
      setSeverity("error");
      return;
    }

    const classList = truongSnap.data().list;
    if (!Array.isArray(classList)) {
      setMessage("❌ Dữ liệu list không hợp lệ.");
      setSeverity("error");
      return;
    }

    const newAccounts = [];
    let skipCount = 0;

    for (let i = 0; i < classList.length; i++) {
      const className = classList[i];
      const accountRef = doc(db, "ACCOUNT", className);
      const accountSnap = await getDoc(accountRef);
      if (!accountSnap.exists()) {
        newAccounts.push(className);
      } else {
        skipCount++;
      }
      setProgress(Math.round(((i + 1) / classList.length) * 100));
    }

    const BATCH_LIMIT = 500;
    let successCount = 0;

    for (let i = 0; i < newAccounts.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const chunk = newAccounts.slice(i, i + BATCH_LIMIT);

      chunk.forEach(className => {
        const ref = doc(db, "ACCOUNT", className);
        const khoiSo = className.split(".")[0]; // "2.3" -> "2"
        const khoi = `K${khoiSo}`;              // -> "K2"

        batch.set(ref, {
          username: className,
          password: password,
          hoTen: "",
          khoi: khoi,
        });
      });

      try {
        await batch.commit();
        successCount += chunk.length;
      } catch (err) {
        console.error("❌ Lỗi khi ghi batch:", err);
      }

      const progressDone = classList.length + i + chunk.length;
      const totalSteps = classList.length + newAccounts.length;
      setProgress(Math.min(100, Math.round((progressDone / totalSteps) * 100)));
    }

    setMessage(`✅ Đã tạo ${successCount} tài khoản mới. 🚫 Bỏ qua ${skipCount} tài khoản đã tồn tại.`);
    setSeverity("success");
  } catch (error) {
    console.error("❌ Lỗi xử lý:", error);
    setMessage("❌ Có lỗi xảy ra.");
    setSeverity("error");
  } finally {
    setTimeout(() => {
      setProgress(0);
      setActionType("");
    }, 3000);
  }
};

// Hàm reset mật khẩu
export const resetClassUserPasswords = async ({
  db,
  password,
  namHoc,
  setActionType,
  setProgress,
  setMessage,
  setSeverity,
}) => {
  if (!password || password.trim() === "") {
    alert("❌ Vui lòng nhập mật khẩu hợp lệ!");
    return;
  }

  if (!namHoc || namHoc === "UNKNOWN") {
    alert("❌ Không có năm học hợp lệ!");
    return;
  }

  try {
    setActionType("reset");

    const truongRef = doc(db, `CLASSLIST_${namHoc}`, "TRUONG");
    const truongSnap = await getDoc(truongRef);

    if (!truongSnap.exists()) {
      setMessage("❌ Không tìm thấy danh sách lớp.");
      setSeverity("error");
      return;
    }

    const classList = truongSnap.data().list;
    if (!Array.isArray(classList)) {
      setMessage("❌ Dữ liệu danh sách lớp không hợp lệ.");
      setSeverity("error");
      return;
    }

    const BATCH_LIMIT = 500;
    let successCount = 0;
    let failList = [];

    for (let i = 0; i < classList.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const chunk = classList.slice(i, i + BATCH_LIMIT);

      chunk.forEach(className => {
        const accountRef = doc(db, "ACCOUNT", className);
        batch.set(accountRef, {
          password: password,
          date: deleteField(),
        }, { merge: true });
      });

      try {
        await batch.commit();
        successCount += chunk.length;
      } catch (err) {
        console.error("❌ Lỗi ghi batch:", err);
        failList.push(...chunk);
      }

      const processed = Math.min(classList.length, i + chunk.length);
      setProgress(Math.round((processed / classList.length) * 100));
    }

    if (failList.length > 0) {
      setMessage(`⚠️ Đã reset ${successCount} tài khoản. ${failList.length} bị lỗi.`);
      setSeverity("warning");
    } else {
      setMessage(`✅ Đã reset xong mật khẩu cho ${successCount} tài khoản (và xóa field "date").`);
      setSeverity("success");
    }
  } catch (error) {
    console.error("❌ Lỗi reset mật khẩu:", error);
    setMessage("❌ Có lỗi xảy ra.");
    setSeverity("error");
  } finally {
    setTimeout(() => {
      setProgress(0);
      setActionType("");
    }, 3000);
  }
};
