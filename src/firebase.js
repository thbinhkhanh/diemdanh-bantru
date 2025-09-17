// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Cấu hình Firebase mới
const firebaseConfig = {
  apiKey: "AIzaSyDAcbzsDsK0vg0tn8PvLM5JoUVABDenB70",
  authDomain: "diemdanh-bantru-17d03.firebaseapp.com",
  projectId: "diemdanh-bantru-17d03",
  storageBucket: "diemdanh-bantru-17d03.firebasestorage.app",
  messagingSenderId: "639395884521",
  appId: "1:639395884521:web:ed052133d1c9ef8d1d6f78"
};

// Khởi tạo Firebase hoặc lấy app đã tồn tại
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Khởi tạo các service
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
