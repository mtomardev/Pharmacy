import { addDoc, collection, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const saveInvoiceToFirestore = async (customerId, customerName, customerPhone, selectedMedicines, totalPrice) => {
  try {
    // Save invoice in sales collection first to get the ID
    const invoiceRef = await addDoc(collection(db, "sales"), {});
    const invoiceData = {
      invoiceId: invoiceRef.id, // Use Firestore ID as Bill Number
      customerId: customerId || null,
      customerName,
      customerPhone,
      medicines: selectedMedicines.map((medicine) => ({
        id: medicine.id,
        name: medicine.name,
        quantity: medicine.quantity,
        sellingPrice: medicine.sellingPrice,
        mrp: medicine.mrp || 0, // Ensure MRP is always present
      })),
      
      totalPrice,
      timestamp: serverTimestamp(), // Auto-generate timestamp
    };

    // Update Firestore document with invoice data
    await setDoc(invoiceRef, invoiceData);
    console.log("Invoice saved with ID:", invoiceRef.id);
    
    // If customer exists, also store invoice under customers/{customerId}/invoices
    if (customerId) {
      const customerInvoiceRef = doc(db, `customers/${customerId}/invoices/${invoiceRef.id}`);
      await setDoc(customerInvoiceRef, invoiceData);
      console.log("Invoice also saved under customer profile:", customerId);
    }

    alert("Invoice saved successfully!");
    return { ...invoiceData, invoiceId: invoiceRef.id }; // Return invoice data
  } catch (error) {
    console.error("Error saving invoice:", error);
    alert("Failed to save invoice.");
    return null;
  }
};

export default saveInvoiceToFirestore;
