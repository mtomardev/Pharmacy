import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // Import Firestore instance

const saveInvoiceToFirestore = async (
  customerId,
  customerName,
  customerPhone,
  selectedMedicines,
  totalPrice
) => {
  try {
    const invoiceId = Date.now().toString(); // Generate unique invoice ID

    // 🔥 Fetch all medicines from inventory to get costPrice
    const inventorySnapshot = await getDocs(collection(db, "medicines")); // Adjust collection name if needed
    const inventoryData = inventorySnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data().costPrice ?? 0; // Store costPrice for each medicine
      return acc;
    }, {});

    // ✅ Add costPrice to each medicine before saving
    const medicinesWithCost = selectedMedicines.map((med) => ({
      id: med.id,
      name: med.name,
      quantity: med.quantity,
      sellingPrice: med.sellingPrice,
      mrp: med.mrp,
      costPrice: inventoryData[med.id] ?? 0, // Fetch costPrice from inventory
    }));

    // ✅ Save invoice in Firestore with costPrice included
    const invoiceData = {
      invoiceId,
      customerId,
      customerName,
      customerPhone,
      medicines: medicinesWithCost, // 🔥 Now includes costPrice
      totalPrice,
      timestamp: new Date(),
    };

    await setDoc(doc(db, "sales", invoiceId), invoiceData); // Save invoice in Firestore
    
    console.log("Invoice saved successfully:", invoiceData);
    alert("Invoice saved successfully!");
    return invoiceData;
  } catch (error) {
    console.error("Error saving invoice:", error);
    alert("Failed to save invoice.");
    return null;
  }
};

export default saveInvoiceToFirestore;
