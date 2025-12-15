// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVzcazffHHKArujdQSDXDlCUbK_3dIJtM",
  authDomain: "ebboka-53259604-4480e.firebaseapp.com",
  projectId: "ebboka-53259604-4480e",
  storageBucket: "ebboka-53259604-4480e.firebasestorage.app",
  messagingSenderId: "243362733032",
  appId: "1:243362733032:web:afcb4b64179c9c8f0c225d"
};

// Initialize Firebase
// Use existing app if initialized, otherwise create new one (prevents reload errors)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
