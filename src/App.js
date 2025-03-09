import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; // Use Routes instead of Switch for React Router v6
import EmailPasswordAuth from "./components/EmailPasswordAuth"; // Login Page
import InvoicePage from "./components/InvoicePage"; // Invoice Page Component
import InventoryPage from "./components/Inventory"; // Inventory Page Component
import NavBar from "./components/Navbar"; // Navigation Bar
import { auth } from "./firebase"; // Firebase Authentication
import { onAuthStateChanged } from "firebase/auth"; // Listen for auth state changes
import SalesReport from "./components/SalesReport";
import ExpensesPage from "./components/ExpensesPage";
import CustomerDetails from "./components/CustomerDetails";
import CustomerPurchaseHistory from "./components/CustomerPurchaseHistory";
import InvoiceDetails from "./components/InvoiceDetails";
import Distributors from "./components/Distributors";
import DistributorProfile from "./components/DistributorProfile";
import { ThemeProvider } from "./components/ThemeContext";

function App() {
  const [user, setUser] = useState(null);

  // Check if user is logged in or not
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Update the user state based on authentication status
    });

    return () => unsubscribe(); // Cleanup the listener
  }, []);

  return (
    <ThemeProvider>
    <Router>
      <NavBar user={user} /> {/* Display NavBar with user authentication status */}
      <Routes>
        {/* Route for Home/Invoice page */}
        <Route path="/" element={user ? <InvoicePage /> : <EmailPasswordAuth />} />
        
        {/* Route for Login page */}
        <Route path="/login" element={user ? <InvoicePage /> : <EmailPasswordAuth />} />

        {/* Route for Invoice page */}
        <Route path="/invoice" element={user ? <InvoicePage /> : <EmailPasswordAuth />} />

        {/* Route for Inventory page */}
        <Route path="/inventory" element={user ? <InventoryPage /> : <EmailPasswordAuth />} />

        {/* Route for SalesReport */}
        <Route path="/salesreport" element={user ? <SalesReport /> : <EmailPasswordAuth />} />

        {/* Route for ExpenseReport */}
        <Route path="/expensereport" element={user ? <ExpensesPage/> : <EmailPasswordAuth />} />

        {/* Route for CustomerDetails */}
        <Route path="/customerdetails" element={user ? <CustomerDetails/> : <EmailPasswordAuth />} />
        
        {/* This will ensure the page loads when clicking View on the Customer Details Page. */}
        <Route path="/customer/:customerId" element={<CustomerPurchaseHistory />} />

        {/* This will ensure the page loads when clicking View on the Invoice Details Page. */}
        {/* <Route path="/sales/:customerId/:invoiceId" element={<InvoiceDetails />} /> */}
        <Route path="/customer/:customerId/sales/:invoiceId" element={<InvoiceDetails />} />
        
         {/* Route for Walk-in Customer Purchase History by invoiceId */}
        <Route path="/sales/:invoiceId" element={<CustomerPurchaseHistory />} />

      {/* Route for Walk-in Customer Invoice Details */}
       <Route path="/sales/:invoiceId/details" element={<InvoiceDetails />} />

        {/* Route for CustomerDetails */}
        <Route path="/distributors" element={user ? <Distributors/> : <EmailPasswordAuth />} />
        <Route path="/distributor/:id" element={<DistributorProfile />} />



      </Routes>
    </Router>
    </ThemeProvider>
  );
}

export default App;
