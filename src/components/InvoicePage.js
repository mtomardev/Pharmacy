import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import Firebase Auth
import { db } from "../firebase"; // Import Firestore instance
import "./InvoicePage.css"; // Custom styles for the layout
import saveInvoiceToFirestore from "./saveInvoiceToFirestore";
import "./General.css";

import { doc, updateDoc } from "firebase/firestore"; // Import doc and updateDoc

const InvoicePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [medicines, setMedicines] = useState([]); // All medicines from Firestore
  const [filteredMedicines, setFilteredMedicines] = useState([]); // Medicines matching the search
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [customerPhone, setCustomerPhone] = useState(""); // Customer's phone number
  const [customerName, setCustomerName] = useState(""); // Customer's name
  const [customerId, setCustomerId] = useState(null); // Customer ID to link invoice
  const [greetingMessage, setGreetingMessage] = useState(""); // Message for greeting the customer
  const [loggedInUser, setLoggedInUser] = useState(""); // Logged-in user's name
  const [error, setError] = useState(""); // Error message state
  const [loading, setLoading] = useState(false); // Loading state for async operations
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // Track highlighted index
  const [showRegistrationForm, setShowRegistrationForm] = useState(false); // Show registration form if no user is found
  const [showSearchButton, setShowSearchButton] = useState(true); // Show the search button initially
  const [customerHistory, setCustomerHistory] = useState([]);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

 
  


  // Fetch medicines from Firestore once when the component loads
  useEffect(() => {
    const fetchMedicines = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "medicines"));
        const medicinesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMedicines(
          medicinesData.map(medicine => ({
            ...medicine,
            quantity: Number(medicine.quantity) || 0 // Convert to number and handle potential undefined values
          }))
        );         // Store all medicines, including salt
      } catch (error) {
        console.error("Error fetching medicines: ", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, []);

  // Fetch logged-in user's name (you, the user)
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setLoggedInUser(user.displayName || "Guest");
    }
  }, []);

  // Filter medicines dynamically as the user types
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMedicines([]); // Show nothing if the search term is empty
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const results = medicines.filter((medicine) => {
        const nameMatch = medicine.name?.toLowerCase().includes(lowerCaseSearchTerm);
        const saltMatch = String(medicine.salt || "").toLowerCase().includes(lowerCaseSearchTerm);
        return nameMatch || saltMatch;
      });      
      setFilteredMedicines(results); // Update filtered medicines based on search
    }
  }, [searchTerm, medicines]);

  // Add a medicine to the invoice
  const addToInvoice = async (medicine) => {
    if (medicine.quantity <= 0) {
      alert("This medicine is out of stock.");
      return;
    }
    console.log("Adding Medicine:", medicine); // Debugging log

     // Update Firestore inventory
  const medicineRef = doc(db, "medicines", medicine.id);
  await updateDoc(medicineRef, {
    quantity: medicine.quantity - 1,
  });


  // Fetch the updated medicines after update
  const updatedMedicines = medicines.map((m) =>
    m.id === medicine.id ? { ...m, quantity: m.quantity - 1 } : m
  );
  setMedicines(updatedMedicines);

    const updatedList = [
      ...selectedMedicines,
      {
        id: medicine.id,
        name: medicine.name,
        quantity: 1,
        sellingPrice: medicine.sellingPrice,
        mrp: medicine.mrp || 0, // Ensure MRP is included
      },
    ];
    setSelectedMedicines(updatedList);
    calculateTotal(updatedList);
    setSearchTerm("");
    setFilteredMedicines([]);
    setHighlightedIndex(-1);
  };
  
  const removeFromInvoice = async (medicineId) => {
     // Find the removed medicine from selectedMedicines
     const removedMedicine = selectedMedicines.find(
      (medicine) => medicine.id === medicineId
    );
  
    if (!removedMedicine) return;
     // Remove the medicine from the selectedMedicines array
    const updatedList = selectedMedicines.filter(
      (medicine) => medicine.id !== medicineId
    );
    setSelectedMedicines(updatedList);
    calculateTotal(updatedList);
  
    // Restore quantity in Firestore
    const medicineRef = doc(db, "medicines", medicineId);

    await updateDoc(medicineRef, {
      quantity: medicines.find((m) => m.id === medicineId).quantity + removedMedicine.quantity, // Restore correct quantity
    });
    

     // Fetch updated medicines from Firestore
  const updatedMedicines = medicines.map((m) =>
    m.id === medicineId ? { ...m, quantity: m.quantity + 1 } : m
  );
  setMedicines(updatedMedicines);

    // Optionally, you can log to see the updated quantity
  console.log(`Updated quantity for ${removedMedicine.name}: ${removedMedicine.quantity + 1}`);

  };
    

  // Update the total price
  const calculateTotal = (medicinesList) => {
    const total = medicinesList.reduce(
      (sum, medicine) => sum + medicine.sellingPrice * medicine.quantity,
      0
    );
    setTotalPrice(total);
  };

 
  const updateQuantity = async (id, newQuantity) => {
    if (isNaN(newQuantity) || newQuantity <= 0) {
      console.error("Invalid quantity input", newQuantity);
      return;
    }
  
    const updatedList = selectedMedicines.map((medicine) => {
      if (medicine.id === id) {
        const quantityDifference = newQuantity - (medicine.quantity || 0);
        return { ...medicine, quantity: newQuantity };
      }
      return medicine;
    });
  
    setSelectedMedicines(updatedList);
    calculateTotal(updatedList);
  
    const medicineRef = doc(db, "medicines", id);
    
    const originalQuantity = medicines.find((m) => m.id === id)?.quantity || 0;
const previousQuantity = selectedMedicines.find((m) => m.id === id)?.quantity || 0;
const quantityDifference = newQuantity - previousQuantity;

await updateDoc(medicineRef, {
  quantity: originalQuantity - quantityDifference,
});

  
    // Refresh the medicine stock
    const updatedMedicines = medicines.map((m) =>
      m.id === id ? { ...m, quantity: m.quantity - newQuantity } : m
    );
    setMedicines(updatedMedicines);
  };
  
  
  
  


  
  // Handle keyboard navigation for search results
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prevIndex) =>
        Math.min(filteredMedicines.length - 1, prevIndex + 1)
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prevIndex) => Math.max(0, prevIndex - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      addToInvoice(filteredMedicines[highlightedIndex]);
    }
  };

  // Form validation for customer phone number
  const validatePhoneNumber = () => {
    if (customerPhone.length !== 10 || isNaN(customerPhone)) {
      setError("Phone number must be 10 digits.");
      return false;
    }
    setError(""); // Clear error message if validation passes
    return true;
  };

  // Search for the customer by phone number or show registration form
  const handleSearchCustomer = async () => {
    if (!validatePhoneNumber()) return; // Stop if phone number validation fails

    setLoading(true); // Start loading state

    const customerRef = query(collection(db, "customers"), where("phone", "==", customerPhone));
    const querySnapshot = await getDocs(customerRef);

    if (!querySnapshot.empty) {
      const customerDoc = querySnapshot.docs[0];
      setCustomerId(customerDoc.id); // Set the customer ID if found
      setCustomerName(customerDoc.data().name); // Set the customer's name
      setGreetingMessage(`Hello Mr. ${customerDoc.data().name}`); // Set the greeting message
      setShowRegistrationForm(false); // Hide registration form
      setShowSearchButton(false); // Hide search button after customer is found
    } else {
      setGreetingMessage(""); // Clear the greeting message
      setShowRegistrationForm(true); // Show the registration form for new user
      setShowSearchButton(false); // Hide search button when no user is found
    }

    setLoading(false); // End loading state
  };

  // Handle the customer registration
  const handleRegisterCustomer = async () => {
    if (!customerName.trim() || !validatePhoneNumber()) return; // Ensure name and phone number are valid

    const newCustomerRef = await addDoc(collection(db, "customers"), {
      name: customerName,
      phone: customerPhone,
    });
    setCustomerId(newCustomerRef.id); // Set the newly created customer ID
    setGreetingMessage(`Welcome, ${customerName}`); // Set the greeting message
    setShowRegistrationForm(false); // Hide the registration form
    setShowSearchButton(false); // Hide search button after registration
    alert("New customer profile created!");
  };


  
  console.log("Final selected medicines before saving:", selectedMedicines);

  const handleSaveInvoice = async () => {
    if (selectedMedicines.length === 0) {
      alert("No medicines selected for the invoice.");
      return;
    }
  

    const invoiceData = await saveInvoiceToFirestore(
      customerId,
      customerName,
      customerPhone,
      selectedMedicines,
      totalPrice
    );
  
    if (invoiceData) {
      setLastInvoice(invoiceData); // Store invoice data in state
    }
  };
  

//fetchCustomerHistory
  const fetchCustomerHistory = async (customerId, setHistory) => {
    if (!customerId) {
      alert("No customer selected.");
      return;
    }
  
    try {
      const querySnapshot = await getDocs(collection(db, `customers/${customerId}/invoices`));
      const invoices = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      setHistory(invoices); // Store data in state
    } catch (error) {
      console.error("Error fetching customer history:", error);
      alert("Failed to fetch customer history.");
    }
  };

  const handleViewHistory = () => {
    fetchCustomerHistory(customerId, setCustomerHistory);
  };
  
  return (
    <div className="invoice-page-container container">
      <h1>Invoice Page</h1>

      {/* Mobile Number Search */}
      <div className="customer-info">
        <input
          type="text"
          placeholder="Enter Customer Phone"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
        {showSearchButton && (
          <button onClick={handleSearchCustomer} disabled={loading}>
            {loading ? "Loading..." : "Search"}
          </button>
        )}
        {error && <div className="error">{error}</div>}
        {greetingMessage && <div className="greeting">{greetingMessage}</div>}
      </div>

      {/* Registration Form if User is Not Found */}
      {showRegistrationForm && (
        <div className="registration-form">
          <input
            type="text"
            placeholder="Enter Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <button onClick={handleRegisterCustomer}>Register Customer</button>
        </div>
      )}

      {/* Medicine Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search medicines by name or salt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // Trigger dynamic search
          onKeyDown={handleKeyDown} // Add keyboard navigation
        />
      </div>

      {/* Medicine Search Results */}
      <div className="medicine-results">
        {filteredMedicines.length > 0 ? (
          filteredMedicines.map((medicine, index) => (
            <div
              key={medicine.id}
              className={`medicine-item ${
                index === highlightedIndex ? "highlighted" : ""}`}
            >
              <span>{medicine.name}</span>
              <span>Salt: {medicine.salt || "N/A"}</span> {/* Display Salt Name */}
              <span>MRP: ₹{medicine.mrp}</span>
              <span>Selling Price: ₹{medicine.sellingPrice}</span>
              {/* Show Quantity with Red if 0 */}
              <span className={`quantity ${medicine.quantity === 0 ? "out-of-stock" : ""}`}>
          Quantity: {medicine.quantity > 0 ? medicine.quantity : "Out of Stock"}
        </span> {/* Show Quantity */}
        
        {/* Disable Add Button if Quantity is Zero */}
        <button 
          onClick={() => addToInvoice(medicine)} 
          disabled={medicine.quantity <= 0}
          className={medicine.quantity <= 0 ? "disabled-button" : ""}
        >
          {medicine.quantity > 0 ? "Add" : "Out of Stock"}
        </button>
            </div>
          ))
        ) : (
          <p>{searchTerm ? "No medicines found." : "Start typing to search..."}</p>
        )}
      </div>

      <button onClick={handleViewHistory}>View Purchase History</button>
      {customerHistory.length > 0 && (
  <div>
    <h2>Purchase History</h2>
    <table>
      <thead>
        <tr>
          <th>Invoice ID</th>
          <th>Total Price</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
  {customerHistory.map((invoice) => (
    <tr key={invoice.id}>
      <td>{invoice.invoiceId}</td>
      <td>₹{invoice.totalPrice}</td>
      <td>{new Date(invoice.timestamp?.seconds * 1000).toLocaleDateString()}</td>
      <td>
        <button onClick={() => setSelectedInvoice(invoice)}>View Invoice</button>
      </td>
    </tr>
  ))}
</tbody>

    </table>
    {selectedInvoice && (
  <div className="invoice-details">
    <h2>Invoice Details</h2>
    <p><strong>Bill No:</strong> {selectedInvoice.invoiceId}</p>
    <p><strong>Customer Name:</strong> {selectedInvoice.customerName}</p>
    <p><strong>Customer Phone:</strong> {selectedInvoice.customerPhone}</p>
    <h3>Medicines</h3>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Quantity</th>
          <th>MRP</th>
          <th>Selling Price</th>
        </tr>
      </thead>
      <tbody>
        {selectedInvoice.medicines.map((medicine, index) => (
          <tr key={index}>
            <td>{medicine.name}</td>
            <td>{medicine.quantity}</td>
            <td>₹{medicine.mrp}</td> {/* Show MRP */}
            <td>₹{medicine.sellingPrice}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <h3>Total Price: ₹{selectedInvoice.totalPrice}</h3>
    <button onClick={() => setSelectedInvoice(null)}>Close</button>
  </div>
)}

  </div>
)}


      {/* Invoice Layout */}
      <div id="invoice-print">
      <div className="invoice-layout">
        {/* Left Side: Shop Details */}
        <div className="left-side">
          <p>Tomar Pharmacy</p>
          <p>D-59 Gali No 1, Rajpur Khurd, New Delhi 110068</p>
        </div>

        {/* Right Side: Invoice Details */}
        <div className="right-side">
        {lastInvoice && <p>Bill No: {lastInvoice.invoiceId}</p>}
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Name: {customerName}</p>
          <p>Number: {customerPhone}</p>
        </div>
      </div>

      {/* Medicine List Table */}
      {selectedMedicines.length > 0 && (
        <>
          {/* <h2>Invoice</h2> */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Qty</th>
                <th>Name</th>
                <th>MRP</th>
                <th>Selling Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedMedicines.map((medicine, index) => (
                <tr key={medicine.id}>
                  <td>{index + 1}</td>
                  <td>
                    {/* <input
                      type="number"
                      value={medicine.quantity}
                      min="1"
                      onChange={(e) =>
                        updateQuantity(medicine.id, parseInt(e.target.value, 10))
                      }
                    /> */}
                     <input
    type="number"
    value={medicine.quantity}
    min="1"
    onChange={(e) =>
      updateQuantity(medicine.id, parseInt(e.target.value, 10)) // Call updateQuantity with the new quantity
    }
  />
                  </td>
                  <td>{medicine.name}</td>
                  <td>₹{medicine.mrp}</td>
                  <td>₹{medicine.sellingPrice}</td>
                  <td>
                  <button
                      onClick={() => removeFromInvoice(medicine.id)} // Use the removeFromInvoice function
                  >
                    Remove
                  </button>

                    {/* <button
                      onClick={() =>
                        setSelectedMedicines((prev) =>
                          prev.filter((m) => m.id !== medicine.id)
                        )
                      }
                    >
                      Remove
                    </button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Total Price */}
          <div className="total-price">
            <h3>Total Price: ₹{totalPrice}</h3>
          </div>
          {/* save */}
          
        </>
      )}

      </div>
      <button onClick={handleSaveInvoice}>Save Invoice</button>
      <button className="printbutton" onClick={() => window.print()}>Print Invoice</button>

    </div>
  );
};

export default InvoicePage;
