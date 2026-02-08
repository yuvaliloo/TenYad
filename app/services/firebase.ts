import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// ... Your Config Object ...
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};



export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 1. Determine which storage to use based on Platform
let authPersistence;

if (Platform.OS === 'web') {
  // Use standard browser storage for Web
  authPersistence = browserLocalPersistence;
} else {
  // Use AsyncStorage for iOS/Android
  try {
    authPersistence = getReactNativePersistence(AsyncStorage);
  } catch (error) {
    console.warn("getReactNativePersistence not available, using browserLocalPersistence");
    authPersistence = browserLocalPersistence;
  }
}

// 2. Initialize Auth with the correct persistence
export const auth = initializeAuth(app, {
  persistence: authPersistence,
});

// 3. Initialize Firestore 
// We only force long polling on Android (to fix the timer bug). 
// Web and iOS work better with default settings.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: Platform.OS === 'android',
});

export const storage = getStorage(app);

// Debug: Log storage configuration
console.log("🔥 Firebase Storage Config:");
console.log("  Bucket:", storage.app.options.storageBucket);
console.log("  Project ID:", storage.app.options.projectId);