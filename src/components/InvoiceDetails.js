

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Button } from "./ui/button";
import "./General.css";

const InvoiceDetails = () => {
  const { invoiceId } = useParams(); // ✅ Only extract invoiceId (customerId not needed)
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Track loading state

  useEffect(() => {
    if (!invoiceId) {
      console.error("Invoice ID is missing!");
      return;
    }

    const fetchInvoice = async () => {
      try {
        console.log("Fetching Invoice for ID:", invoiceId);
        const invoiceRef = doc(db, "sales", invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (invoiceSnap.exists()) {
          const invoiceData = invoiceSnap.data();
          console.log("Fetched Invoice Data:", invoiceData);
          setInvoice(invoiceData);
        } else {
          console.error("Invoice not found!");
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
      } finally {
        setLoading(false); // ✅ Stop loading once fetch completes
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div>Loading invoice details...</div>;
  }

  if (!invoice) {
    return <div>Error: Invoice not found!</div>;
  }

  return (
    <div className="p-4 border rounded bg-white container">
      <h1 className="text-xl font-bold mb-4">Invoice Details</h1>
      <p><strong>Customer:</strong> {invoice.customerName || "N/A"} ({invoice.customerPhone || "N/A"})</p>
      <p><strong>Date:</strong> {invoice.timestamp ? invoice.timestamp.toDate().toLocaleString() : "N/A"}</p>
      <p><strong>Total Amount:</strong> ₹{invoice.totalPrice || "N/A"}</p>
      
      <h2 className="text-lg font-bold mt-4">Purchased Medicines</h2>
      <table className="w-full border mt-2 styled-table">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Medicine</th>
            <th className="border p-2">Strip Qty</th>
            <th className="border p-2">Loose Qty</th>
            <th className="border p-2">Selling Price</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(invoice.medicines) && invoice.medicines.length > 0 ? (
            invoice.medicines.map((med, index) => (
              <tr key={index}>
                <td className="border p-2">{med.name || "N/A"}</td>
                <td className="border p-2">{med.quantity || "N/A"}</td>
                <td className="border p-2">{med.lossQuantity || "N/A"}</td>
                <td className="border p-2">₹{med.sellingPrice || "N/A"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="border p-2" colSpan="3">No medicines found</td>
            </tr>
          )}
        </tbody>
      </table>
      
      <Button className="mt-4" onClick={handlePrint}>Print Invoice</Button>
    </div>
  );
};

export default InvoiceDetails;
