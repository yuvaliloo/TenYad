import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ... Your Config Object ...
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// 1. Determine which storage to use based on Platform
let authPersistence;

if (Platform.OS === 'web') {
  // Use standard browser storage for Web
  authPersistence = browserLocalPersistence;
} else {
  // Use AsyncStorage for iOS/Android
  authPersistence = getReactNativePersistence(AsyncStorage);
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