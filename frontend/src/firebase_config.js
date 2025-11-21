import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyApVo7mhMJTBDREGcIPmPsgUpp10y9lazk",
  authDomain: "text2visuals-a69.firebaseapp.com",
  projectId: "text2visuals-a69",
  storageBucket: "text2visuals-a69.firebasestorage.app",
  messagingSenderId: "1009319923115",
  appId: "1:1009319923115:web:ad524b4e964c061c7496ee",
  measurementId: "G-WCZ11JX5SS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();