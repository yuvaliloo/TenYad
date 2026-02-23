import { Platform } from "react-native";
import { initializeApp, getApp, getApps } from "firebase/app";

// 🟢 FIX: Tell TypeScript to ignore the missing type definition
// @ts-ignore
import { 
  initializeAuth, 
  getReactNativePersistence, 
  getAuth 
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 1. Determine Auth initialization based on Platform
let auth: any;

if (Platform.OS === 'web') {
  // 🟢 WEB: getAuth automatically uses standard browser persistence safely
  auth = getAuth(app);
} else {
  // 📱 MOBILE: Inject AsyncStorage
  // The try-catch prevents crashes during Expo Fast Refresh (hot reloads)
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    auth = getAuth(app); // Fallback if already initialized
  }
}

export { auth };

// 3. Initialize Firestore 
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: Platform.OS === 'android',
});

export const storage = getStorage(app);