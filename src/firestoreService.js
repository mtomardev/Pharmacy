import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase"; // Import db from firebase.js

// Function to add a new medicine to Firestore
const addMedicine = async () => {
  try {
    const docRef = await addDoc(collection(db, "medicines"), {
      name: "Paracetamol",
      price: 5.99,
      expiryDate: "2025-12-31",
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding document: ", error.message); // Log the error message if any
  }
};

export { addMedicine };
