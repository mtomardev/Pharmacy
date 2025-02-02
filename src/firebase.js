// Import required Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDcPSYLDmMcZX0Zziveuy2-5zPcw-ZRHi8",
  authDomain: "pharmacy-management-syst-c6720.firebaseapp.com",
  projectId: "pharmacy-management-syst-c6720",
  storageBucket: "pharmacy-management-syst-c6720.appspot.com", // Corrected typo
  messagingSenderId: "201860579193",
  appId: "1:201860579193:web:1930cb3b1396586ca339a8",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app); // Firestore for database operations
const auth = getAuth(app); // Authentication for email/password and other methods

// Export services for use in the app
export { db, auth };
