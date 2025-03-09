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
    lossQuantity: medicine.lossQuantity ?? 0, // ✅ Loose pieces quantity
    sellingPrice: medicine.sellingPrice,
    mrp: medicine.mrp,
    costPrice: medicine.costPrice, // ✅ Add this line
    priceloosepiece: medicine.priceloosepiece
    
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
