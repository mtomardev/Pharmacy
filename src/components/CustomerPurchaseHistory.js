
// import React, { useEffect, useState } from "react";
// import { collection, getDocs, query, where } from "firebase/firestore";
// import { db } from "../firebase";
// import { useParams } from "react-router-dom";
// import { Button } from "./ui/button";
// import { Table, TableHead, TableRow, TableCell, TableBody } from "./ui/table";
// import "./General.css";

// const CustomerPurchaseHistory = () => {
//   const { customerId } = useParams();
//   const [customer, setCustomer] = useState(null);
//   const [invoices, setInvoices] = useState([]);

//   useEffect(() => {
//     const fetchInvoices = async () => {
//       let q;

//       if (customerId === "walkin") {
//         // Fetch all sales for walk-in customers
//         q = query(collection(db, "sales"), where("customerId", "==", null));
//         setCustomer({ name: "Walk-in Customers", phone: "N/A" });
//       } else {
//         // Fetch registered customer's invoices
//         q = query(collection(db, "sales"), where("customerId", "==", customerId));
//         const customerRef = collection(db, "customers");
//         const customerSnapshot = await getDocs(customerRef);
//         const customerData = customerSnapshot.docs.find(doc => doc.id === customerId);
//         if (customerData) {
//           setCustomer(customerData.data());
//         }
//       }

//       // Fetch invoices
//       const querySnapshot = await getDocs(q);
//       const invoiceList = querySnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//         timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleString() : "N/A",
//       }));

//       setInvoices(invoiceList);
//     };

//     fetchInvoices();
//   }, [customerId]);

//   return (
//     <div className="p-4 container">
//       {customer && (
//         <h1 className="text-xl font-bold mb-4">
//           Purchase History for {customer.name} ({customer.phone})
//         </h1>
//       )}
//       <Table className="styled-table">
//         <TableHead>
//           <TableRow>
//             <TableCell className="font-bold">Invoice Date</TableCell>
//             <TableCell className="font-bold">Invoice Number</TableCell>
//             <TableCell className="font-bold">Total Amount</TableCell>
//             <TableCell className="font-bold">Actions</TableCell>
//           </TableRow>
//         </TableHead>
//         <TableBody>
//           {invoices.map((invoice) => (
//             <TableRow key={invoice.id}>
//               <TableCell>{invoice.timestamp}</TableCell>
//               <TableCell>{invoice.id}</TableCell>
//               <TableCell>{invoice.totalPrice}</TableCell>
//               <TableCell>
//                 <Button onClick={() => window.open(`/customer/${customerId}/sales/${invoice.id}`, "_blank")}>
//                   View & Print
//                 </Button>
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>
//     </div>
//   );
// };

// export default CustomerPurchaseHistory;


import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Table, TableHead, TableRow, TableCell, TableBody } from "./ui/table";
import "./General.css";

const CustomerPurchaseHistory = () => {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      let q;

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
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleString() : "N/A",
      }));

      setInvoices(invoiceList);
    };

    fetchInvoices();
  }, [customerId]);

  // Function to delete an invoice
  const deleteInvoice = async (invoiceId) => {
    const isConfirmed = window.confirm("⚠️ Are you sure you want to delete this invoice? This action cannot be undone.");

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "sales", invoiceId)); // Delete from Firebase
        setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== invoiceId)); // Remove from state
        alert("✅ Invoice deleted successfully!");
      } catch (error) {
        console.error("❌ Error deleting invoice:", error);
        alert("❌ Failed to delete invoice.");
      }
    }
  };

  return (
    <div className="p-4 container">
      {customer && (
        <h1 className="text-xl font-bold mb-4">
          Purchase History for {customer.name} ({customer.phone})
        </h1>
      )}
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
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>{invoice.timestamp}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerPurchaseHistory;
