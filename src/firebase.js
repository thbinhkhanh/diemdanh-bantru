// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  //apiKey: "AIzaSyAg6_1youLoG83BhHb_TSWI8Ma8wRRCWbE",
  //authDomain: "diemdanh-bantru-e5e43.firebaseapp.com",
  //projectId: "diemdanh-bantru-e5e43",
  //storageBucket: "diemdanh-bantru-e5e43.appspot.com",
  //messagingSenderId: "1063726842881",
  //appId: "1:1063726842881:web:9f2b533d9c7ff230beec00",
  //measurementId: "G-SK3V1E2SWV"

  //apiKey: "AIzaSyDAcbzsDsK0vg0tn8PvLM5JoUVABDenB70",
  //authDomain: "diemdanh-bantru-17d03.firebaseapp.com",
  //projectId: "diemdanh-bantru-17d03",
  //storageBucket: "diemdanh-bantru-17d03.firebasestorage.app",
  //messagingSenderId: "639395884521",
  //appId: "1:639395884521:web:ed052133d1c9ef8d1d6f78"
  
  //thbinhkhanh3@gmail.com

  //apiKey: "AIzaSyDABUgzEzkd02WfAFU-hUuol_ZFRVo97YI",
  //authDomain: "diemdanh-bantru.firebaseapp.com",
  //projectId: "diemdanh-bantru",
  //storageBucket: "diemdanh-bantru.firebasestorage.app",
  //messagingSenderId: "64783667725",
  //appId: "1:64783667725:web:953a812eb9324429d67b44",
  //measurementId: "G-QWRBNFD2T5"

  //thbinhkhanh.tuyensinh@gmail.com

  apiKey: "AIzaSyAsnWcIyhvtVHYA6taPOf7EWIUqEZPWO5E",
  authDomain: "diemdanh-bantru-450d5.firebaseapp.com",
  projectId: "diemdanh-bantru-450d5",
  storageBucket: "diemdanh-bantru-450d5.firebasestorage.app",
  messagingSenderId: "444541342075",
  appId: "1:444541342075:web:ff4bb4db26967676ebedde",
  measurementId: "G-KGCTCSD3GJ"

  //test

};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };


