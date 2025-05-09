

import React, { useEffect, useState } from "react";
import { collection, getDocs, getDoc, updateDoc, query, where, addDoc, deleteDoc, doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Table, TableHead, TableRow, TableCell, TableBody } from "./ui/table";
import "./General.css";

const CustomerPurchaseHistory = () => {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [newPurchase, setNewPurchase] = useState({
    billNumber: "",
    billDate: "",
    totalBill: "",
    notes: "",
    finalPrice: "",
  });

  const fetchInvoices = async () => {
    let q;
    
    // Get customer data
    if (customerId === "walkin") {
      q = query(collection(db, "sales"), where("customerId", "==", null));
      setCustomer({ name: "Walk-in Customers", phone: "N/A" });
    } else {
      q = query(collection(db, "sales"), where("customerId", "==", customerId));
      const customerRef = collection(db, "customers");
      const customerSnapshot = await getDocs(customerRef);
      const customerData = customerSnapshot.docs.find((doc) => doc.id === customerId);
      if (customerData) {
        setCustomer(customerData.data());
      }
    }

    const querySnapshot = await getDocs(q);
    const invoiceList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null,
      timestamp: (() => {
        const ts = doc.data().timestamp;
        if (!ts) return null;
        if (typeof ts.toDate === "function") return ts.toDate(); // Firestore Timestamp
        if (ts instanceof Date) return ts; // JS Date
        if (typeof ts === "string") return new Date(ts); // ISO string
        return null;
      })(),
      
    }));

    // Extract distinct years for the dropdown filter
    const years = [...new Set(invoiceList.map((invoice) => invoice.timestamp?.getFullYear()))];
    setAvailableYears(years);

    // Apply filtering by day, month, and year before setting state
    const filteredInvoices = invoiceList.filter((invoice) => {
      const invoiceDate = invoice.timestamp ? invoice.timestamp.getDate().toString().padStart(2, '0') : "";
      const invoiceMonth = invoice.timestamp ? String(invoice.timestamp.getMonth() + 1).padStart(2, '0') : "";
      const invoiceYear = invoice.timestamp ? invoice.timestamp.getFullYear().toString() : "";

      const matchesDay = selectedDay ? invoiceDate === selectedDay : true;
      const matchesMonth = selectedMonth ? invoiceMonth === selectedMonth : true;
      const matchesYear = selectedYear ? invoiceYear === selectedYear : true;

      return matchesDay && matchesMonth && matchesYear;
    });

    // Sort invoices by date (ascending or descending depending on preference)
    filteredInvoices.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setInvoices(filteredInvoices);
  };

  useEffect(() => {
    fetchInvoices(); // Fetch invoices when the component mounts
  }, [customerId, selectedDay, selectedMonth, selectedYear]);

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    const docRef = await addDoc(collection(db, "sales"), {
      ...newPurchase,
      customerId,
      timestamp: new Date(),
    });

    // Clear form and refetch invoices
    setNewPurchase({
      billNumber: "",
      billDate: "",
      totalBill: "",
      notes: "",
      finalPrice: "",
    });

    // Refetch invoices after adding a new purchase
    fetchInvoices(); 
  };




const deleteInvoice = async (invoiceId) => {
  const isConfirmed = window.confirm("⚠️ Are you sure you want to delete this invoice? This action cannot be undone.");
  if (!isConfirmed) return;

  try {
    console.log(`🔍 Fetching invoice ID: ${invoiceId}`);

    // Fetch invoice details
    const invoiceRef = doc(db, "sales", invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      alert("❌ Invoice not found in Firestore!");
      return;
    }

    const invoiceData = invoiceSnap.data();
    const medicines = invoiceData.medicines || [];

    console.log(`📜 Invoice Data:`, invoiceData);
    console.log(`💊 Medicines in Invoice:`, medicines);

    if (medicines.length === 0) {
      alert("❌ No medicines found in this invoice!");
      return;
    }

    // **Fetch all medicines in one request** (batch)
    const medicineRefs = medicines.map((med) => doc(db, "medicines", med.id));
    const medicineSnapshots = await getDocs(query(collection(db, "medicines"), where("__name__", "in", medicines.map(m => m.id))));

    // Convert to a Map for faster lookups
    let medicineDataMap = new Map();
    medicineSnapshots.forEach((snap) => {
      if (snap.exists()) {
        medicineDataMap.set(snap.id, snap.data());
      }
    });

    // Start Firestore transaction
    await runTransaction(db, async (transaction) => {
      for (let medicine of medicines) {
        if (!medicineDataMap.has(medicine.id)) {
          console.warn(`⚠️ Medicine ${medicine.id} not found in Firestore. Skipping...`);
          continue;
        }

        const medicineData = medicineDataMap.get(medicine.id);
        console.log(`🔄 Updating medicine ${medicine.id}:`, medicineData);

        let updatedStripQuantity = (medicineData.quantity || 0) + (medicine.quantity || 0);
        let updatedLooseQuantity = (medicineData.lossQuantity || 0) + (medicine.lossQuantity || 0);

        if (updatedLooseQuantity >= medicineData.stripsize) {
          updatedStripQuantity += Math.floor(updatedLooseQuantity / medicineData.stripsize);
          updatedLooseQuantity = updatedLooseQuantity % medicineData.stripsize;
        }

        transaction.update(doc(db, "medicines", medicine.id), {
          quantity: updatedStripQuantity,
          lossQuantity: updatedLooseQuantity,
          totalPieces: updatedStripQuantity * medicineData.stripsize + updatedLooseQuantity,
        });

        console.log(`✅ Medicine ${medicine.id} updated successfully.`);
      }

      transaction.delete(invoiceRef);
      console.log(`🗑 Invoice ${invoiceId} deleted.`);
    });

    setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== invoiceId));
    alert("✅ Invoice deleted, quantity updated successfully!");
  } catch (error) {
    console.error("❌ Error deleting invoice:", error);
    alert(`❌ Failed to delete invoice. Error: ${error.message}`);
  }
};



  
  

  return (
    <div className="p-4 container">
      {customer && (
        <h1 className="text-xl font-bold mb-4">
          Purchase History for {customer.name} ({customer.phone})
        </h1>
      )}

      {/* Filter Section */}
      <div className="filter-section mb-4">
        

        <div>
          <label>Filter by Month: </label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="">All Months</option>
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>

        <div>
          <label>Filter by Year: </label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      

      {/* Invoice Table */}
      <Table className="styled-table">
        <TableHead>
          <TableRow>
            <TableCell className="font-bold">Invoice Date</TableCell>
            <TableCell className="font-bold">Invoice Number</TableCell> 
            

            <TableCell className="font-bold">Total Amount</TableCell>
            <TableCell className="font-bold">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.length > 0 ? (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  {invoice.timestamp
                    ? `${invoice.timestamp.getDate().toString().padStart(2, '0')}-${(invoice.timestamp.getMonth() + 1).toString().padStart(2, '0')}-${invoice.timestamp.getFullYear()}`
                    : "N/A"}
                </TableCell>
                <TableCell>{invoice.id}</TableCell>
                <TableCell>{invoice.totalPrice}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => window.open(`/customer/${customerId}/sales/${invoice.id}`, "_blank")}
                    className="mr-2"
                  >
                    View & Print
                  </Button>
                  <Button onClick={() => deleteInvoice(invoice.id)} className="bg-red-500">
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan="4" className="text-center">
                No invoices found for the selected filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerPurchaseHistory;


