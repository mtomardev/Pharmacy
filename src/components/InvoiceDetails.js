import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Button } from "./ui/button";

const InvoiceDetails = () => {
  const { customerId, invoiceId } = useParams(); // Get both customerId & invoiceId from URL
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      const invoiceRef = doc(db, `customers/${customerId}/invoices`, invoiceId); // Nested path
      const invoiceSnap = await getDoc(invoiceRef);
      if (invoiceSnap.exists()) {
        console.log("Fetched Invoice Data:", invoiceSnap.data()); // Debugging
        setInvoice(invoiceSnap.data());
      }
    };
    fetchInvoice();
  }, [customerId, invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) {
    return <div>Loading invoice details...</div>;
  }

  return (
    <div className="p-4 border rounded bg-white">
      <h1 className="text-xl font-bold mb-4">Invoice Details</h1>
      <p><strong>Customer:</strong> {invoice.customerName} ({invoice.customerPhone})</p>
      <p><strong>Date:</strong> {invoice.date}</p>
      <p><strong>Total Amount:</strong> ₹{invoice.totalPrice}</p>
      
      <h2 className="text-lg font-bold mt-4">Purchased Medicines</h2>
      <table className="w-full border mt-2">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Medicine</th>
            <th className="border p-2">Quantity</th>
            <th className="border p-2">Price</th>
          </tr>
        </thead>
        <tbody>
          {invoice.medicines.map((med, index) => (
            <tr key={index}>
              <td className="border p-2">{med.name}</td>
              <td className="border p-2">{med.quantity}</td>
              <td className="border p-2">₹{med.sellingPrice ? med.sellingPrice : "N/A"}</td>
            </tr>
            
          ))}
        </tbody>
      </table>
      
      <Button className="mt-4" onClick={handlePrint}>Print Invoice</Button>
    </div>
  );
};

export default InvoiceDetails;
