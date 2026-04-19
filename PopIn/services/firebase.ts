import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE
//  How to get it:
//    1. Go to console.firebase.google.com
//    2. Click your project → gear icon → Project settings
//    3. Scroll to "Your apps" → click the web app (</>)
//    4. Copy the values below from the firebaseConfig block
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "PASTE_HERE",
  authDomain:        "PASTE_HERE",
  projectId:         "PASTE_HERE",
  storageBucket:     "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId:             "PASTE_HERE",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
