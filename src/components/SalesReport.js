import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Import Firebase config
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Timestamp } from "firebase/firestore";

const ReportPage = () => {
  const [filter, setFilter] = useState("daily");
  const [sales, setSales] = useState(0);
  const [profit, setProfit] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customStartDate, setCustomStartDate] = useState("");
const [customEndDate, setCustomEndDate] = useState("");


  useEffect(() => {
    fetchData();
  }, [filter]);

  
  
  
  

const fetchData = async () => {
  const salesRef = collection(db, "sales");

  const now = new Date();
  let startDate;
  let q; // ✅ Declare q early

  if (filter === "custom") {
    if (!customStartDate || !customEndDate) return;
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999); // include the full end day
    q = query(
      salesRef,
      where("timestamp", ">=", Timestamp.fromDate(start)),
      where("timestamp", "<=", Timestamp.fromDate(end))
    );
  } else {
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
      default:
        startDate = null;
    }
  
    if (startDate) {
      const firestoreStartDate = Timestamp.fromDate(startDate);
      q = query(salesRef, where("timestamp", ">=", firestoreStartDate));
    } else {
      q = query(salesRef);
    }
  }
  

 
  if (startDate) {
    const firestoreStartDate = Timestamp.fromDate(startDate); // Convert Date to Firestore Timestamp
    q = query(salesRef, where("timestamp", ">=", firestoreStartDate));
  } else {
    q = query(salesRef);
  }

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
    <input
      type="date"
      value={customStartDate}
      onChange={(e) => setCustomStartDate(e.target.value)}
      className="border px-2 py-1 rounded"
    />
    <input
      type="date"
      value={customEndDate}
      onChange={(e) => setCustomEndDate(e.target.value)}
      className="border px-2 py-1 rounded"
    />
    <Button onClick={fetchData}>Apply</Button>
  </div>
)}

        </div>

        {/* Total Sales & Total Profit */}
        <Card className="mb-4">
          <CardContent>
            <h2>Total Sales: ₹{sales}</h2>
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
      <div className="col-span-2 overflow-auto h-60">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Net Payable</th>
              <th>Total Profit</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
  {invoices.slice(0, 10).map((invoice) => (
    <tr key={invoice.id}>
      <td>{invoice.id}</td>
      <td >₹{invoice.netPayableAmount.toFixed(2)}</td>
      <td>₹{invoice.totalProfit.toFixed(2)}</td>  {/* Updated to show per-invoice profit */}
      <td><Button onClick={() => setSelectedInvoice(invoice)}>View</Button></td>
    </tr>
  ))}
</tbody>

        </table>
      </div>

      {/* Invoice Details Modal */}
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
