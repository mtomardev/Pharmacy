// import { collection, doc, getDocs, setDoc } from "firebase/firestore";
// import { db } from "../firebase"; // Import Firestore instance

// const saveInvoiceToFirestore = async (
//   customerId,
//   customerName,
//   customerPhone,
//   selectedMedicines,
//   totalPrice
// ) => {
//   try {
//     const invoiceId = Date.now().toString(); // Generate unique invoice ID

//     // 🔥 Fetch all medicines from inventory to get costPrice
//     const inventorySnapshot = await getDocs(collection(db, "medicines")); // Adjust collection name if needed
//     const inventoryData = inventorySnapshot.docs.reduce((acc, doc) => {
//       acc[doc.id] = doc.data().costPrice ?? 0; // Store costPrice for each medicine
//       return acc;
//     }, {});

//     // ✅ Add costPrice to each medicine before saving
//     const medicinesWithCost = selectedMedicines.map((med) => ({
//       id: med.id,
//       name: med.name,
//       quantity: med.quantity,
//       sellingPrice: med.sellingPrice,
//       mrp: med.mrp,
//       costPrice: inventoryData[med.id] ?? 0, // Fetch costPrice from inventory
//     }));

//     // ✅ Save invoice in Firestore with costPrice included
//     const invoiceData = {
//       invoiceId,
//       customerId,
//       customerName,
//       customerPhone,
//       medicines: medicinesWithCost, // 🔥 Now includes costPrice
//       totalPrice,
//       timestamp: new Date(),
//     };

//     await setDoc(doc(db, "sales", invoiceId), invoiceData); // Save invoice in Firestore
    
//     console.log("Invoice saved successfully:", invoiceData);
//     alert("Invoice saved successfully!");
//     return invoiceData;
//   } catch (error) {
//     console.error("Error saving invoice:", error);
//     alert("Failed to save invoice.");
//     return null;
//   }
// };

// export default saveInvoiceToFirestore;


//new code
// import { writeBatch, doc } from "firebase/firestore";
// import { db } from "../firebase"; // Import Firestore instance



// const saveInvoiceToFirestore = async (selectedMedicines) => {
//   if (!Array.isArray(selectedMedicines)) {
//     console.error("Expected an array but got:", selectedMedicines);
//     alert("Error: Invalid data format. Expected an array.");
//     return;
//   }

//   if (selectedMedicines.length === 0) {
//     alert("No medicines selected.");
//     return;
//   }

//   const batch = writeBatch(db);
//   selectedMedicines.forEach(medicine => {
//     if (!medicine.id || typeof medicine.id !== "string") {
//       console.error("Invalid medicine object:", medicine);
//       return;
//     }

//     const medicineRef = doc(db, "medicines", medicine.id);
//     batch.update(medicineRef, {
//       quantity: Math.max(medicine.quantity - (medicine.soldQuantity || 1), 0), // Ensure valid update
//     });
//   });

//   await batch.commit();
//   // alert("Invoice saved and stock updated!");
// };

// export default saveInvoiceToFirestore

//one more

import { writeBatch, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // Import Firestore instance

const saveInvoiceToFirestore = async (
  customerId,
  customerName,
  customerPhone,
  selectedMedicines,
  totalPrice
) => {
  if (!Array.isArray(selectedMedicines)) {
    console.error("Expected an array but got:", selectedMedicines);
    alert("Error: Invalid data format. Expected an array.");
    return;
  }

  if (selectedMedicines.length === 0) {
    alert("No medicines selected.");
    return;
  }

  const batch = writeBatch(db);

  // Create a unique invoice ID
  const invoiceId = Date.now().toString(); // Or use your own logic to generate invoice ID

  // Update medicine quantities and prepare the invoice data
  const medicinesWithCost = selectedMedicines.map((medicine) => ({
    id: medicine.id,
    name: medicine.name,
    quantity: medicine.quantity,
    sellingPrice: medicine.sellingPrice,
    mrp: medicine.mrp,
    costPrice: medicine.costPrice || 0, // Ensure costPrice is included if available
  }));

 

  // Save the invoice in Firestore
  const invoiceData = {
    invoiceId,
    customerId,
    customerName,
    customerPhone,
    medicines: medicinesWithCost,
    totalPrice,
    timestamp: new Date(),
  };

  const invoiceRef = doc(db, "sales", invoiceId);
  batch.set(invoiceRef, invoiceData);

  try {
    await batch.commit();
    alert("Invoice saved and stock updated successfully!");
    return invoiceData
  } catch (error) {
    console.error("Error saving invoice:", error);
    alert("Failed to save invoice.");
  }
};

export default saveInvoiceToFirestore;
