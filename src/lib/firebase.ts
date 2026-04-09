import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAHRDDpPVHtDGpz_9FLrr3h9yt_Xj4gDQk",
  authDomain: "futsankhya.firebaseapp.com",
  projectId: "futsankhya",
  storageBucket: "futsankhya.firebasestorage.app",
  messagingSenderId: "705205349636",
  appId: "1:705205349636:web:4dc1c7de8f64a407543451",
  measurementId: "G-8WX2DF265K"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
