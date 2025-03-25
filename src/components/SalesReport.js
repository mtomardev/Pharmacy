import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const SalesReport = () => {
  const [salesData, setSalesData] = useState([]);
  const [reportType, setReportType] = useState("daily"); // Default report type
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    fetchSalesReport();
  }, [reportType, startDate, endDate]);

  const fetchSalesReport = async () => {
    try {
      let salesQuery = collection(db, "sales");
      const today = new Date();
      let start, end;
      
      // Report date ranges setup (existing code)
      if (reportType === "daily") {
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
      } else if (reportType === "weekly") {
        start = new Date();
        start.setDate(today.getDate() - 7);
      } else if (reportType === "monthly") {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (reportType === "yearly") {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
      } else if (reportType === "custom" && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      }
      
      if (start && end) {
        salesQuery = query(salesQuery, where("timestamp", ">=", start), where("timestamp", "<=", end));
      }
      
      const querySnapshot = await getDocs(salesQuery);
      const sales = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Full medicine data:', data.medicines); // Log full medicines array to check fields
        return {
          ...data,
          medicines: data.medicines?.map(med => {
            // Log individual medicine data to check costPrice
            console.log(`Medicine: ${med.name}, Selling Price: ${med.sellingPrice}, Cost Price: ${med.costPrice}`);
            return {
              id: med.id,
              name: med.name,
              quantity: med.quantity,
              sellingPrice: med.sellingPrice,
              costPrice: med.costPrice ? med.costPrice : 0, // Ensure costPrice is always included
            };
          }) || [],
        };
      });
      
      console.log("Fetched Sales Data:", sales);
      setSalesData(sales);
      calculateTotals(sales);
    } catch (error) {
      console.error("Error fetching sales report:", error);
    }
  };
  
  

  const calculateTotals = (sales) => {
    let totalSalesAmount = 0;
    let totalProfitAmount = 0;
    
    sales.forEach(sale => {
      totalSalesAmount += sale.totalPrice;
      sale.medicines.forEach(med => {
        console.log(`Medicine: ${med.name}, Selling Price: ${med.sellingPrice}, Cost Price: ${med.costPrice}, Quantity: ${med.quantity}`);
        const costPrice = med.costPrice ?? 0; // Ensure costPrice is always defined
        totalProfitAmount += (med.sellingPrice - costPrice) * med.quantity;
      });
    });
    
    setTotalSales(parseFloat(totalSalesAmount.toFixed(2)));
    setTotalProfit(parseFloat(totalProfitAmount).toFixed(2) );
  };

  return (
    <div>
      <h1>Sales Report</h1>
      <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="custom">Custom</option>
      </select>
      {reportType === "custom" && (
        <>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </>
      )}
      <button onClick={fetchSalesReport}>Generate Report</button>
      <h2>Total Sales: ₹{totalSales}</h2>
      <h2>Total Profit: ₹{totalProfit}</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice ID</th>
            <th>Total Price</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {salesData.map((sale, index) => (
            <tr key={index}>
              <td>{sale.invoiceId}</td>
              <td>₹{sale.totalPrice}</td>
              <td>{new Date(sale.timestamp?.seconds * 1000).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesReport;

// import React, { useState, useEffect } from "react";
// import { collection, getDocs, query, where } from "firebase/firestore";
// import { db } from "../firebase";
// import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// const SalesReport = () => {
//   const [salesData, setSalesData] = useState([]);
//   const [reportType, setReportType] = useState("daily");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [totalSales, setTotalSales] = useState(0);
//   const [totalProfit, setTotalProfit] = useState(0);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetchSalesReport();
//   }, [reportType, startDate, endDate]);

//   const fetchSalesReport = async () => {
//     setLoading(true);
//     try {
//       let salesQuery = collection(db, "sales");
//       const today = new Date();
//       let start, end;
      
//       if (reportType === "daily") {
//         start = new Date(today.setHours(0, 0, 0, 0));
//         end = new Date(today.setHours(23, 59, 59, 999));
//       } else if (reportType === "weekly") {
//         start = new Date();
//         start.setDate(today.getDate() - 7);
//       } else if (reportType === "monthly") {
//         start = new Date(today.getFullYear(), today.getMonth(), 1);
//         end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//       } else if (reportType === "yearly") {
//         start = new Date(today.getFullYear(), 0, 1);
//         end = new Date(today.getFullYear(), 11, 31);
//       } else if (reportType === "custom" && startDate && endDate) {
//         start = new Date(startDate);
//         end = new Date(endDate);
//       }
      
//       if (start && end) {
//         salesQuery = query(salesQuery, where("timestamp", ">=", start), where("timestamp", "<=", end));
//       }
      
//       const querySnapshot = await getDocs(salesQuery);
//       const sales = querySnapshot.docs.map(doc => doc.data());
      
//       setSalesData(sales);
//       calculateTotals(sales);
//     } catch (error) {
//       console.error("Error fetching sales report:", error);
//     }
//     setLoading(false);
//   };
  
//   const calculateTotals = (sales) => {
//     let totalSalesAmount = 0;
//     let totalProfitAmount = 0;
    
//     sales.forEach(sale => {
//       totalSalesAmount += sale.totalPrice;
//       totalProfitAmount += sale.totalProfit;
//     });
    
//     setTotalSales(parseFloat(totalSalesAmount.toFixed(2)));
//     setTotalProfit(parseFloat(totalProfitAmount.toFixed(2)));
//   };
  
//   return (
//     <div className="p-4">
//       <h1 className="text-xl font-bold">Sales Report</h1>
//       <div className="flex gap-2 my-4">
//         <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="border p-2 rounded">
//           <option value="daily">Daily</option>
//           <option value="weekly">Weekly</option>
//           <option value="monthly">Monthly</option>
//           <option value="yearly">Yearly</option>
//           <option value="custom">Custom</option>
//         </select>
//         {reportType === "custom" && (
//           <>
//             <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 rounded" />
//             <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 rounded" />
//           </>
//         )}
//       </div>
//       <h2>Total Sales: ₹{totalSales}</h2>
//       <h2>Total Profit: ₹{totalProfit}</h2>
//       {loading ? <p>Loading...</p> : (
//         <div className="my-6">
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={salesData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis 
//   dataKey="timestamp" 
//   tickFormatter={(time) => time?.seconds ? new Date(time.seconds * 1000).toLocaleDateString() : "Invalid Date"} 
// />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Line type="monotone" dataKey="totalPrice" stroke="#8884d8" name="Sales" />
//               <Line type="monotone" dataKey="totalProfit" stroke="#82ca9d" name="Profit" />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>
//       )}
//     </div>
//   );
// };

// export default SalesReport;
