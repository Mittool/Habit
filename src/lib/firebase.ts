// Firebase JS SDK Integration (Web PWA + Mobile Analytics & App Core)
"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCScoBlDSQV6RMkvShx5gsfUiYdV-7P3FE",
  authDomain: "trac-notifications.firebaseapp.com",
  projectId: "trac-notifications",
  storageBucket: "trac-notifications.firebasestorage.app",
  messagingSenderId: "797168193894",
  appId: "1:797168193894:android:39b601ea84920586ec78a7"
};

// Initialize Firebase Core App Singleton
export const firebaseApp = typeof window !== "undefined" && getApps().length === 0 
  ? initializeApp(FIREBASE_CONFIG) 
  : typeof window !== "undefined" ? getApp() : null;

// Initialize Firebase Analytics Telemetry
export async function initFirebaseAnalytics() {
  if (typeof window === "undefined" || !firebaseApp) return null;

  try {
    const supported = await isSupported();
    if (supported) {
      const analytics = getAnalytics(firebaseApp);
      console.log("[Firebase SDK] Analytics telemetry active for project:", FIREBASE_CONFIG.projectId);
      return analytics;
    }
  } catch (err) {
    console.error("[Firebase SDK] Analytics initialization exception:", err);
  }
  return null;
}
