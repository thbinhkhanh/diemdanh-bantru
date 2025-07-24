// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {

  //thbinhkhanh3@gmail.com

  //apiKey: "AIzaSyDABUgzEzkd02WfAFU-hUuol_ZFRVo97YI",
  //authDomain: "diemdanh-bantru.firebaseapp.com",
  //projectId: "diemdanh-bantru",
  //storageBucket: "diemdanh-bantru.firebasestorage.app",
  //messagingSenderId: "64783667725",
  //appId: "1:64783667725:web:953a812eb9324429d67b44",
  //measurementId: "G-QWRBNFD2T5",
  
  //thbinhkhanh.tuyensinh@gmail.com

  apiKey: "AIzaSyAsnWcIyhvtVHYA6taPOf7EWIUqEZPWO5E",
  authDomain: "diemdanh-bantru-450d5.firebaseapp.com",
  projectId: "diemdanh-bantru-450d5",
  storageBucket: "diemdanh-bantru-450d5.firebasestorage.app",
  messagingSenderId: "444541342075",
  appId: "1:444541342075:web:ff4bb4db26967676ebedde",
  measurementId: "G-KGCTCSD3GJ",
  
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };


