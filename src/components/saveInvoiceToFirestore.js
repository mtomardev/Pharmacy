import { writeBatch, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // Import Firestore instance

const saveInvoiceToFirestore = async (
  customerId,
  customerName,
  customerPhone,
  selectedMedicines,
  priceloosepiece,
  mrpTotal, // ✅ MRP Total Amount
  totalSaving, // ✅ Saving Total Savings
  totalPrice, // ✅ Grand Total (already included)
  

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
    priceloosepiece: medicine.priceloosepiece,
    costPrice: medicine.costPrice, // ✅ Add this line
    costPriceLossepiece: medicine.costPriceLossepiece,
    gst: medicine.gst,
    
    
    
  }));

 

  // Save the invoice in Firestore
  const invoiceData = {
    invoiceId,
    customerId,
    customerName,
    customerPhone,
    medicines: medicinesWithCost,
    mrpTotal,
    totalSaving: parseFloat(totalSaving.toFixed(2)), // ✅ Round to 2 decimals,
    totalPrice,
    priceloosepiece: parseFloat(priceloosepiece.toFixed(2)), // ✅ Round to 2 decimals,
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
