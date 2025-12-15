import { initializeApp } from "firebase/app";
// 1. Import from the standard auth path
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { initializeFirestore } from 'firebase/firestore'; // Import this at the top
import { getStorage } from "firebase/storage";



// ... Your Config Object ...
  const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// 2. Initialize Auth with the "Force Fix"
export const auth = initializeAuth(app, {
  // We cast AsyncStorage as 'any' to fix the type mismatch error
  persistence: getReactNativePersistence(AsyncStorage as any)
});

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);