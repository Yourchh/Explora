import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC1lGT3oldujKRIIQkPmWbsY36HbTZxRKQ",
  authDomain: "bitacora-geo.firebaseapp.com",
  projectId: "bitacora-geo",
  storageBucket: "bitacora-geo.firebasestorage.app",
  messagingSenderId: "3108534207",
  appId: "1:3108534207:web:436acd958367791909930a",
  measurementId: "G-E8273LZYDK",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
