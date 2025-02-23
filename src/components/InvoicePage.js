import React, { useState, useEffect } from "react";
import { collection, getDocs, getDoc, addDoc, query, where, doc, writeBatch } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import Firebase Auth
import { db } from "../firebase"; // Import Firestore instance
import "./InvoicePage.css"; // Custom styles for the layout
import saveInvoiceToFirestore from "./saveInvoiceToFirestore";
import "./General.css";


// import { doc, updateDoc } from "firebase/firestore"; // Import doc and updateDoc

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

  

  const addToInvoice = (medicine) => {  // 🔵 Removed 'async' since Firestore update is no longer here
    if (medicine.quantity <= 0) {
      alert("This medicine is out of stock.");
      return;
    }
    console.log("Adding Medicine:", medicine); // Debugging log

    // 🔵 Firestore update REMOVED (we now update Firebase only when the invoice is saved)

    // 🔵 Check if the medicine is already in the selected list
    const existingMedicine = selectedMedicines.find((m) => m.id === medicine.id);

    let updatedList;
    if (existingMedicine) {
      // 🔵 If already in the list, increase quantity
      updatedList = selectedMedicines.map((m) =>
        m.id === medicine.id ? { ...m, quantity: m.quantity + 1 } : m
      );
    } else {
      // 🔵 If not in the list, add it with quantity = 1
      updatedList = [
        ...selectedMedicines,
        {
          id: medicine.id,
          name: medicine.name,
          quantity: 1,
          sellingPrice: medicine.sellingPrice,
          mrp: medicine.mrp || 0, // Ensure MRP is included
        },
      ];
    }

    setSelectedMedicines(updatedList);
    calculateTotal(updatedList);
    setSearchTerm("");
    setFilteredMedicines([]);
    setHighlightedIndex(-1);
};

  
  
const removeFromInvoice = (medicineId) => {
  const removedMedicine = selectedMedicines.find((m) => m.id === medicineId);
  if (!removedMedicine) return;

  const updatedList = selectedMedicines.filter((m) => m.id !== medicineId);
  setSelectedMedicines(updatedList);
  calculateTotal(updatedList);

  // ✅ Firestore update will happen only when invoice is saved
};

    

  // Update the total price
  const calculateTotal = (medicinesList) => {
    const total = medicinesList.reduce(
      (sum, medicine) => sum + medicine.sellingPrice * medicine.quantity,
      0
    );
    setTotalPrice(total);
  };

 

  
const updateQuantity = (id, newQuantity) => {
  if (isNaN(newQuantity) || newQuantity <= 0) return;

  const updatedList = selectedMedicines.map(m =>
    m.id === id ? { ...m, quantity: newQuantity } : m
  );

  setSelectedMedicines(updatedList);
  calculateTotal(updatedList);

  // ✅ Firestore and inventory updates only when invoice is saved (correct)
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

    const customerRef = query(collection(db, "customers"), where("phone", "==", customerPhone.trim()));
    const querySnapshot = await getDocs(customerRef);

    if (!querySnapshot.empty) {
      const customerDoc = querySnapshot.docs[0];
      setCustomerId(customerDoc.id); // Set the customer ID if found
      setCustomerName(customerDoc.data().name); // Set the customer's name
      setGreetingMessage(`Hello ${customerDoc.data().name || "Customer"}`); // Set the greeting message
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

//   const handleSaveInvoice = async () => {
//     if (selectedMedicines.length === 0) {
//         alert("No medicines selected for the invoice.");
//         return;
//     }

//     console.log("Final selected medicines before saving:", selectedMedicines);
//     console.log("Type of selectedMedicines:", typeof selectedMedicines);
//     console.log("Is selectedMedicines an array?", Array.isArray(selectedMedicines));

//     try {
//         const invoiceData = await saveInvoiceToFirestore(
//             customerId,
//             customerName,
//             customerPhone,
//             selectedMedicines, // Ensure this is an array
//             totalPrice
//         );

//         if (invoiceData) {
//             setLastInvoice(invoiceData);
//         }
//     } catch (error) {
//         console.error("Error saving invoice:", error);
//     }
// };

// const handleSaveInvoice = async () => {

//   console.log("handleSaveInvoice function started!"); // ✅ Add this

//   if (selectedMedicines.length === 0) {
//       alert("No medicines selected for the invoice.");
//       return;
//   }

//   console.log("Final selected medicines before saving:", selectedMedicines);
//   console.log("Type of selectedMedicines:", typeof selectedMedicines);
//   console.log("Is selectedMedicines an array?", Array.isArray(selectedMedicines));
//   console.log("🚀 Function started: Processing Invoice and Stock Update");
//   try {
//       // Save the invoice first
//       const invoiceData = await saveInvoiceToFirestore(
//           customerId,
//           customerName,
//           customerPhone,
//           selectedMedicines, // Ensure this is an array
//           totalPrice
//       );

//       if (invoiceData) {
//           // After saving the invoice, update the quantity of the medicines in Firestore
//           const batch = writeBatch(db);

//           selectedMedicines.forEach(medicine => {
//               if (medicine.id) {
//                   const medicineRef = doc(db, "medicines", medicine.id);
             
//                     // ✅ Ensure quantityInStock is fetched correctly from Firestore
//           const currentStock = Number(medicine.quantityInStock) || 0;
//           const soldQuantity = Number(medicine.quantity) || 0;
             
             
//                   // Subtract the sold quantity from available stock
//                   const newQuantity = Math.max(currentStock - soldQuantity, 0);

//                   console.log(`Updating stock for ${medicine.name} (ID: ${medicine.id})`);
//           console.log(`Current Stock: ${currentStock}, Sold: ${soldQuantity}, New Stock: ${newQuantity}`);

          
//            // ✅ Correct Firestore field update
//            batch.update(medicineRef, { quantityInStock: newQuantity });
//               }
//           });

//           // Commit the batch operation to update Firestore
//           // await batch.commit();
//           console.log("🛠️ Preparing to commit Firestore batch update...");
//           try {
//             await batch.commit();
//             console.log("✅ Firestore stock update committed successfully!");
//           } catch (error) {
//             console.error("❌ Firestore update error:", error);
//           }
//           // Set the last invoice after saving and updating stock
//           // setLastInvoice(invoiceData);
//            // ✅ Reset invoice form after successful save
//       setSelectedMedicines([]);
//       setTotalPrice(0);
//       setLastInvoice(invoiceData);
//       }
//   } catch (error) {
//       console.error("Error saving invoice:", error);
//   }
// };

const handleSaveInvoice = async () => {
  console.log("handleSaveInvoice function started!");

  if (selectedMedicines.length === 0) {
      alert("No medicines selected for the invoice.");
      return;
  }

  console.log("Final selected medicines before saving:", selectedMedicines);

  try {
      // Step 1: Save invoice in Firestore
      const invoiceData = await saveInvoiceToFirestore(
          customerId,
          customerName,
          customerPhone,
          selectedMedicines,
          totalPrice
      );
      console.log("✅ Invoice saved successfully:", invoiceData);
      if (invoiceData) {
          console.log("✅ Invoice saved successfully:", invoiceData);
          
          // Step 2: Trigger stock update separately
          await updateStockAfterInvoice(invoiceData.invoiceId);
      }

      // Reset invoice form
      setSelectedMedicines([]);
      setTotalPrice(0);
      setLastInvoice(invoiceData);

  } catch (error) {
      console.error("❌ Error saving invoice:", error);
  }
};


const updateStockAfterInvoice = async (invoiceId) => {
  console.log(`🚀 Updating stock for invoice: ${invoiceId}`);

  try {
      const invoiceRef = doc(db, "sales", invoiceId);    

      const invoiceSnap = await getDoc(invoiceRef);

      if (!invoiceSnap.exists()) {
          console.log("❌ Invoice invoiceSnap", invoiceSnap);
          return;
      }

      const invoiceData = invoiceSnap.data();
      const medicinesSold = invoiceData.medicines || [];

      console.log("📦 Medicines from invoice:",invoiceData, medicinesSold);

      // Step 3: Fetch & update stock
      const batch = writeBatch(db);

      for (const medicine of medicinesSold) {
          if (!medicine.id) continue;

          const medicineRef = doc(db, "medicines", medicine.id);
          const medicineSnap = await getDoc(medicineRef);

          console.log("medicine snap ",medicineRef, medicineSnap.data())
          if (!medicineSnap.exists()) {
              console.warn(`⚠️ Medicine not found: ${medicine.name}`);
              continue;
          }
          const currentStock = Number(medicineSnap.data().quantity) || 0;
          const soldQuantity = Number(medicine.quantity) || 0;

          // Ensure stock doesn't go negative
          const newQuantity = Math.max(currentStock - soldQuantity, 0);

          console.log(`🔄 Updating stock for ${medicine.name}: ${currentStock} → ${newQuantity}`);

          batch.update(medicineRef, { quantity: newQuantity });
      }

      await batch.commit();
      console.log("✅ Stock update committed successfully!");

  } catch (error) {
      console.log("❌ Error updating stock:", error);
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
