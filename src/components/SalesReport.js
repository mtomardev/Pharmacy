import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Import Firebase config
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Timestamp } from "firebase/firestore";
import "./SalesReport.css";

const ReportPage = () => {
  const [filter, setFilter] = useState("daily");
  const [sales, setSales] = useState(0);
  const [profit, setProfit] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customStartDate, setCustomStartDate] = useState("");
const [customEndDate, setCustomEndDate] = useState("");


  // useEffect(() => {
  //   fetchData();
  // }, [filter]);

  useEffect(() => {
  if (filter === "custom" && customStartDate && customEndDate) {
    fetchData();
  } else if (filter !== "custom") {
    fetchData();
  }
}, [filter, customStartDate, customEndDate]);

// ✅ Add this AFTER the above useEffect
useEffect(() => {
  if (filter === "custom") {
    setInvoices([]);
    setSales(0);
    setProfit(0);
  }
}, [customStartDate, customEndDate]);

  
  
  

const fetchData = async () => {
  const salesRef = collection(db, "sales");
  let q; // ✅ Declare q early
  
  const now = new Date();
  let startDate;


 if (filter === "custom") {
  if (!customStartDate || !customEndDate) return;

  const start = new Date(customStartDate);
  const end = new Date(customEndDate);
  end.setHours(23, 59, 59, 999); // include the whole end day

  if (start > end) {
    console.error("Invalid date range");
    return;
  }

  console.log("Fetching data between", start, "and", end);

  q = query(
    salesRef,
    where("timestamp", ">=", Timestamp.fromDate(start)),
    where("timestamp", "<=", Timestamp.fromDate(end))
  );
  } else {
    let startDate;
    switch (filter) {
      case "daily":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "yearly":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
  
    
  if (startDate) {
    // const firestoreStartDate = Timestamp.fromDate(startDate); // Convert Date to Firestore Timestamp
    // q = query(salesRef, where("timestamp", ">=", firestoreStartDate));
    q = query(salesRef, where("timestamp", ">=", Timestamp.fromDate(startDate)));
  } else {
    q = query(salesRef);
  }


  }
  

 
  // if (startDate) {
  //   const firestoreStartDate = Timestamp.fromDate(startDate); // Convert Date to Firestore Timestamp
  //   q = query(salesRef, where("timestamp", ">=", firestoreStartDate));
  // } else {
  //   q = query(salesRef);
  // }

  const querySnapshot = await getDocs(q);
  let totalSales = 0;
  let invoicesData = [];

  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log("Raw Firestore Timestamp:", data.timestamp);

    // 🔹 Ensure timestamp is valid before converting
    const saleDate = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now());
    console.log("Sale Date:", saleDate); // Debugging

    const invoiceProfit = data.medicines.reduce((acc, med) => {
        // 🔹 Ensure values are numbers and not undefined
        const sellingPrice = Number(med.sellingPrice) || 0;
        const costPrice = Number(med.costPrice) || 0;
        const quantity = Number(med.quantity) || 0;

        const sellingPriceLoose = Number(med.sellingPriceLoosePiece) || 0;
        const costPriceLoose = Number(med.costPriceLossepiece) || 0;
        const lossQuantity = Number(med.lossQuantity) || 0;

        const fullProfit = (sellingPrice - costPrice) * quantity;
        const looseProfit = (sellingPriceLoose - costPriceLoose) * lossQuantity;

        return acc + (fullProfit + looseProfit);
    }, 0);

    // 🔹 Ensure netPayableAmount is a number
    totalSales += Number(data.netPayableAmount) || 0;

    invoicesData.push({
        id: data.invoiceId,
        netPayableAmount: Number(data.netPayableAmount) || 0, // Prevent NaN
        totalProfit: isNaN(invoiceProfit) ? 0 : invoiceProfit, // Prevent NaN
        medicines: data.medicines,
        timestamp: data.timestamp?.toDate?.() || null,  // ✅ Add this line
    });
});

// Debugging logs
console.log("Invoices Data Before Setting State:", invoicesData);


  const totalProfit = invoicesData.reduce((sum, i) => sum + i.totalProfit, 0);

  setSales(totalSales);
  setProfit(totalProfit);
  setInvoices(invoicesData);
};

  

  const calculateAmount = (medicine) => {
    const { quantity, lossQuantity, sellingPrice, sellingPriceLoosePiece } = medicine;

    // Case 1: Full Strip Purchase
    const fullStripAmount = quantity * sellingPrice;

    // Case 2: Loose Piece Purchase
    const loosePieceAmount = lossQuantity * sellingPriceLoosePiece;

    // Case 3: Both (Adding Both Amounts)
    const totalAmount = fullStripAmount + loosePieceAmount;

    console.log("Amount Calculation for:", medicine);
    console.log("Full Strip Amount:", fullStripAmount);
    console.log("Loose Piece Amount:", loosePieceAmount);
    console.log("Total Amount:", totalAmount);

    return totalAmount;
};


  const calculateProfit = (medicine) => {
    const { quantity, lossQuantity, costPrice, costPriceLossepiece, sellingPrice, sellingPriceLoosePiece} = medicine;

    // ✅ Fix variable names & ensure all fields exist
    
    // Case 1: Full Strip Purchase
    const fullStripProfit = (quantity || 0) * ((sellingPrice || 0) - (costPrice || 0));

    // Case 2: Loose Piece Purchase
    const loosePieceProfit = (lossQuantity || 0) * ((sellingPriceLoosePiece || 0) - (costPriceLossepiece || 0));

    // Case 3: Both (Adding Both Profits)
    const totalProfit = fullStripProfit + loosePieceProfit;


    console.log(`Calculating Profit for ${medicine.name}: ₹${totalProfit}`);

    return totalProfit;
};



  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      <div>
        {/* Filter Options */}
        <div className="flex gap-2 mb-4">
          {["Daily", "Weekly", "Monthly", "Yearly", "Custom"].map((type) => (
            <Button key={type} onClick={() => setFilter(type.toLowerCase())}>{type}</Button>
          ))}
          {filter === "custom" && (
  <div className="flex gap-2 mt-2">
    <label>Start Date</label>
    <input
      type="date"
      value={customStartDate}
      onChange={(e) => setCustomStartDate(e.target.value)}
      className="border px-2 py-1 rounded"
    />
    <label>End Date</label>
    <input
      type="date"
      value={customEndDate}
      onChange={(e) => setCustomEndDate(e.target.value)}
      className="border px-2 py-1 rounded"
    />
 

  </div>
)}

        </div>

        {/* Total Sales & Total Profit */}
        <Card className="mb-4">
          <CardContent>
            <h2>Total Sales: ₹{sales.toFixed(2)}</h2>
            <h2>Total Profit: ₹{profit.toFixed(2)}</h2>
          </CardContent>
        </Card>
      </div>

      {/* Graph Section */}
      <div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={[{ name: filter, sales, profit }]}> 
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#8884d8" />
            <Line type="monotone" dataKey="profit" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>

  

{/* Invoices Table */}
<div className="table-container">
  <table>
    <thead>
      <tr>
        <th className="p-2 border">S.No.</th>
        <th className="p-2 border">Invoice No</th>
        <th className="p-2 border">Date</th>
        <th className="p-2 border">Net Payable</th>
        <th className="p-2 border">Total Profit</th>
        <th className="p-2 border">Action</th>
      </tr>
    </thead>
    <tbody>
      {[...invoices].reverse().map((invoice, index) => (
        <tr key={invoice.id} className="hover:bg-gray-50">
          <td className="p-2 border">{index + 1}</td>
          <td className="p-2 border">{invoice.id}</td>
          <td className="p-2 border">
  {invoice.timestamp
    ? new Date(invoice.timestamp).toLocaleDateString("en-GB")
    : "N/A"}
</td>

          <td className="p-2 border">₹{invoice.netPayableAmount.toFixed(2)}</td>
          <td className="p-2 border">₹{invoice.totalProfit.toFixed(2)}</td>
          <td className="p-2 border">
            <Button onClick={() => setSelectedInvoice(invoice)}>View</Button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>



      {/* Invoice Details Modal */}
      <h3>Invoice Details</h3>
      {selectedInvoice && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded w-1/2">
            <h2>Invoice Details ({selectedInvoice.id})</h2>
            <table className="w-full border-collapse border border-gray-300 mt-2">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Quantity</th>
                  <th>Loss Qty</th>
                  <th>Amount</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
  {selectedInvoice.medicines.map((med) => (
    <tr key={med.id}>
      <td>{med.name}</td>
      <td>{med.quantity}</td>
      <td>{med.lossQuantity}</td>
      <td>₹{(calculateAmount(med) || 0).toFixed(2)}</td>
      <td>₹{(calculateProfit(med) || 0).toFixed(2)}</td>
    </tr>
  ))}
  {/* Show Net Payable Amount in a separate row */}
  <tr>
    <td colSpan="2" className="font-bold text-right">Total Net Payable:</td>
    <td className="font-bold">₹{selectedInvoice.netPayableAmount.toFixed(2)}</td>
  </tr>

  <tr>
    <td colSpan="2" className="font-bold text-right">Total Profit:</td>
    <td className="font-bold">
      ₹{selectedInvoice.medicines.reduce((total, med) => total + calculateProfit(med), 0).toFixed(2)}
    </td>
  </tr>
</tbody>


            </table>
            <Button className="mt-4" onClick={() => setSelectedInvoice(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;
