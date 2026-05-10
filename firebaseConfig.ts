import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Cambiamos initializeAuth por getAuth
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

// Usar getAuth es mucho más estable para evitar que la app se quede "colgada" en el inicio
export const auth = getAuth(app);
export const db = getFirestore(app);
