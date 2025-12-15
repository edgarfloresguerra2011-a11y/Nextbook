
import { initializeApp, getApps, getApp } from "firebase/app";
// Data & Auth likely handled by Prisma/NextAuth in this app, but adding for future use if needed
// import { getAnalytics } from "firebase/analytics"; 

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
// Use getApps to avoid initializing twice in Next.js hot reload / SSR context
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export { app };
