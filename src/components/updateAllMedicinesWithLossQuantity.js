//this code is helpfull to update deta in firebase on every medicine data


import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase"; // Firestore instance

const updateAllMedicinesWithLossQuantity = async () => {
  try {
    const medicinesRef = collection(db, "medicines"); // Adjust collection name if different
    const querySnapshot = await getDocs(medicinesRef);
    
    const batch = writeBatch(db);
    let updatedCount = 0;

    querySnapshot.forEach((docSnapshot) => {
      const medicineData = docSnapshot.data();
      
      // If lossQuantity is missing, set it to 0
      if (medicineData.lossQuantity === undefined) {
        const medicineRef = doc(db, "medicines", docSnapshot.id);
        batch.update(medicineRef, { lossQuantity: 0 });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      alert(`Updated ${updatedCount} medicines with lossQuantity: 0 ✅`);
    } else {
      alert("All medicines already have lossQuantity field.");
    }

  } catch (error) {
    console.error("Error updating medicines:", error);
    alert("Failed to update lossQuantity in medicines.");
  }
};

export default updateAllMedicinesWithLossQuantity;
