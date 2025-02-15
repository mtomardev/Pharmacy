import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
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
    const fetchCustomerData = async () => {
      const customerRef = doc(db, "customers", customerId);
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        setCustomer(customerSnap.data());
      }
    };

    const fetchInvoices = async () => {
      const invoicesRef = collection(db, `customers/${customerId}/invoices`);
      const querySnapshot = await getDocs(invoicesRef);
      const invoiceList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInvoices(invoiceList);
    };

    fetchCustomerData();
    fetchInvoices();
  }, [customerId]);

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
              <TableCell>{invoice.date}</TableCell>
              <TableCell>{invoice.id}</TableCell>
              <TableCell>{invoice.totalPrice}</TableCell>
              <TableCell>
              <Button onClick={() => window.open(`/customer/${customerId}/invoice/${invoice.id}`, "_blank")}>
  View & Print
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
