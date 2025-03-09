

import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableHead, TableRow, TableCell, TableBody } from "./ui/table";
import "./General.css";

const CustomerDetails = () => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      let customerList = [];

      // Fetch registered customers
      const customerSnapshot = await getDocs(collection(db, "customers"));
      customerList = customerSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        phone: doc.data().phone,
        isWalkIn: false, // Mark as registered customer
      }));

      // Fetch walk-in sales data
      const salesSnapshot = await getDocs(collection(db, "sales"));
      const walkInSales = salesSnapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.customerId || data.customerId === "walkin"; // Identify walk-in sales
      });

      // Add a single "Walk-in Customers" entry
      customerList.push({
        id: "walkin", // Fixed ID for Walk-in Customers
        name: "Walk-in Customers",
        phone: "N/A",
        isWalkIn: true,
        salesCount: walkInSales.length, // Track number of invoices for walk-in customers
      });

      setCustomers(customerList);
    };

    fetchCustomers();
  }, []);

  // Function to delete a customer
  const deleteCustomer = async (customerId) => {
    if (customerId === "walkin") {
      alert("⚠️ You cannot delete Walk-in Customers.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteDoc(doc(db, "customers", customerId));
        setCustomers((prevCustomers) =>
          prevCustomers.filter((customer) => customer.id !== customerId)
        );
        alert("✅ Customer deleted successfully!");
      } catch (error) {
        console.error("❌ Error deleting customer:", error);
        alert("❌ Failed to delete customer.");
      }
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  return (
    <div className="p-4 container">
      <h1 className="text-xl font-bold mb-4 title">Customer Details</h1>
      <div className="card">
        <Input
          placeholder="Search by Name or Phone"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
      </div>
      <Table className="styled-table card">
        <TableHead>
          <TableRow>
            <TableCell className="font-bold">S.No</TableCell>
            <TableCell className="font-bold">Customer Name</TableCell>
            <TableCell className="font-bold">Phone Number</TableCell>
            <TableCell className="font-bold">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredCustomers.map((customer, index) => (
            <TableRow key={customer.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>
                <Button
                  onClick={() =>
                    customer.isWalkIn
                      ? navigate(`/customer/walkin`)
                      : navigate(`/customer/${customer.id}`)
                  }
                  className="mr-2"
                >
                  View
                </Button>
                {!customer.isWalkIn && (
                  <Button onClick={() => deleteCustomer(customer.id)} className="bg-red-500">
                    Delete
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerDetails;

