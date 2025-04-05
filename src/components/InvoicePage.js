
  import React, { useState, useEffect } from "react";
  import { collection, getDocs, getDoc, addDoc, query, where, doc, writeBatch } from "firebase/firestore";
  import { getAuth } from "firebase/auth"; // Import Firebase Auth
  import { db } from "../firebase"; // Import Firestore instance
  import "./InvoicePage.css"; // Custom styles for the layout
  import saveInvoiceToFirestore from "./saveInvoiceToFirestore";
  import "./General.css";
  import { useNavigate } from "react-router-dom";



  const InvoicePage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [medicines, setMedicines] = useState([]); // All medicines from Firestore
    const [filteredMedicines, setFilteredMedicines] = useState([]); // Medicines matching the search
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [netPayableAmount, setNetPayableAmount] = useState(0); //grandTotal
    const [mrpTotal, setMrpTotal] = useState(0); //mrpTotal
    const [totalSaving, setTotalSavings] = useState(0); //Total saving
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
    const navigate = useNavigate();

  
    


    // Fetch medicines from Firestore once when the component loads
    useEffect(() => {
      const fetchMedicines = async () => {
        setLoading(true);
        try {
          const querySnapshot = await getDocs(collection(db, "medicines"));
          const medicinesData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            costPrice: doc.data().costPrice ?? 0, // ✅ Ensure costPrice is always present
            costPriceLossepiece: doc.data().costPriceLossepiece ?? 0, // ✅ Ensure costPrice is always present
            priceloosepiece: doc.data().priceloosepiece ?? 0, // ✅ Explicitly set priceloosepiece
            
          }));
          // ✅ Debugging log: Check if "priceloosepiece" exists in the fetched data
          console.log("deebug Fetched Medicines from Firebase:", medicinesData);

          setMedicines(
            medicinesData.map(medicine => ({
              ...medicine,
              quantity: Number(medicine.quantity) || 0, // Convert to number and handle potential undefined values
              priceloosepiece: Number(medicine.priceloosepiece) || 0 // ✅ Ensure it's always a number
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

    

    const addToInvoice = (medicine) => {  
      if (medicine.quantity <= 0) {
        alert("This medicine is out of stock.");
        return;
      }
      console.log("Adding Medicine:", medicine); // Debugging log

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
            ...medicine,  // ✅ Ensure all fields are copied (including `priceloosepiece`)
            id: medicine.id,
            name: medicine.name,
            quantity: 0,
            lossQuantity: 0,
            sellingPrice: medicine.sellingPrice,
            sellingPriceLoosePiece: medicine.sellingPriceLoosePiece,
            mrp: medicine.mrp || 0, // Ensure MRP is included
            priceloosepiece: medicine.priceloosepiece || 0,
            costPrice: medicine.costPrice ?? 0, // ✅ Ensure costPrice is always set
            costPriceLossepiece: medicine.costPriceLossepiece ?? 0,
            totalSellingPrice: 0, // Initialize selling price
          },
        ];
      }

      setSelectedMedicines(updatedList);
      calculateTotal(updatedList);
      setSearchTerm("");
      setFilteredMedicines([]);
      setHighlightedIndex(-1);
      calculateTotal(updatedList); // 🔵 Recalculate when adding a medicine
  };

    
    
  const removeFromInvoice = (medicineId) => {
    const removedMedicine = selectedMedicines.find((m) => m.id === medicineId);
    if (!removedMedicine) return;

    const updatedList = selectedMedicines.filter((m) => m.id !== medicineId);
    setSelectedMedicines(updatedList);
    calculateTotal(updatedList);

    // ✅ Firestore update will happen only when invoice is saved
  };

      



    const calculateTotal = (medicinesList) => {
      let totalMRP = 0;
    let totalSavings = 0;
    
    let grandTotal = medicinesList.reduce(
        (sum, medicine) => sum + (medicine.totalSellingPrice || 0),
        0
      );

      medicinesList.forEach((medicine) => {
        const stripQty = medicine.quantity || 0;  // Strip Quantity
        const looseQty = medicine.lossQuantity || 0;  // Loose Quantity
    
        // Calculate Total Amount
        totalMRP += (medicine.mrp * stripQty) + (medicine.priceloosepiece * looseQty);

        // Calculate Savings
      totalSavings += (medicine.mrp * stripQty) - (medicine.sellingPrice * stripQty);
      totalSavings += (medicine.priceloosepiece * looseQty) - (medicine.sellingPriceLoosePiece * looseQty);
    });

      console.log("Updated Total Amount:", totalMRP);
    console.log("Updated Savings:", totalSavings);
    console.log("Updated Net Payable Amount Grand Total:", grandTotal);


    setMrpTotal(totalMRP);
    setTotalSavings(totalSavings);
      setNetPayableAmount(grandTotal);
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



    console.log("entering in updateQuantity")


    const updateQuantity = (medicineId, quantity, lossQuantity) => {
      console.log("entered in updateQuantity");
    
      setSelectedMedicines((prevMedicines) => {
        const updatedMedicines = prevMedicines.map((medicine) => {
          if (medicine.id === medicineId) {
            console.log("Updating Medicine:", medicine); // ✅ Debugging
            console.log("Selling Price (Strip):", medicine.sellingPrice);
            console.log("deebug Loose Price:", medicine.priceloosepiece); // ✅ Check if this is still 0 here
    
            const stripPrice = medicine.sellingPrice || 0; // Price per full strip
            // const loosePrice = medicine.priceloosepiece || 0; // Price per loose piece
            const loosePrice = medicine.sellingPriceLoosePiece || 0; // Price per loose piece

            console.log("stripPrice", stripPrice);
            console.log("loosePrice", loosePrice);
    

            let totalSellingPrice = 0;
    
            // ✅ Scenario 1: Buying Full Strip Only
            if (quantity > 0 && lossQuantity === 0) {
              totalSellingPrice =  quantity * stripPrice;
            }
    
            // ✅ Scenario 2: Buying Loose Pieces Only
            if (quantity === 0 && lossQuantity > 0) {
              // totalSellingPrice = lossQuantity * loosePrice;
              totalSellingPrice = parseFloat((lossQuantity * loosePrice).toFixed(2));
    
            }
    
            // ✅ Scenario 3: Buying Both (Full Strip + Loose Pieces)
            if (quantity > 0 && lossQuantity > 0) {
              totalSellingPrice = parseFloat(((quantity * stripPrice) + (lossQuantity * loosePrice)).toFixed(2));
    
            }
    
            return {
              ...medicine,
              quantity: quantity || 0, // Ensure valid number
              lossQuantity: lossQuantity || 0, // Ensure valid number
              totalSellingPrice,
            };
          }
          return medicine;
        });
    
        // ✅ **Fix: Calculate total price after updating quantities**
        calculateTotal(updatedMedicines);
        
        return updatedMedicines;
      });
    };






  const handleSaveInvoice = async () => {
    console.log("handleSaveInvoice function started!");

    if (selectedMedicines.length === 0) {
        alert("No medicines selected for the invoice.");
        return;
    }

  // 🔵 Ensure each medicine has costPrice, quantity, lossQuantity, and totalSellingPrice before saving
    const medicinesWithDetails = selectedMedicines.map((medicine) => ({
      ...medicine,
      id: medicine.id,  // Ensure the ID is explicitly saved
      name: medicine.name, 
      quantity: medicine.quantity ?? 0,  // ✅ Save strip quantity
      lossQuantity: medicine.lossQuantity ?? 0,  // ✅ Save loose pieces quantity
      costPrice: medicine.costPrice ?? 0,  // ✅ Ensure costPrice is saved
      costPriceLossepiece: medicine.costPriceLossepiece ?? 0,  // ✅ Ensure costPriceLossepiece is saved
      sellingPrice: medicine.sellingPrice ?? 0,  // ✅ Save selling price per strip
      sellingPriceLoosePiece: medicine.sellingPriceLoosePiece, // ✅ Save selling price lose piece
      totalSellingPrice: medicine.totalSellingPrice ?? 0,  // ✅ Save total price of this medicine
      mrp: medicine.mrp ?? 0,  // ✅ Save MRP
      priceloosepiece: medicine.priceloosepiece || 0,
  }));

     // 🔴 **Fix: Declare `priceloosepiece` Before Using It**
     const priceloosepiece = selectedMedicines.reduce(
      (total, medicine) => total + (medicine.priceloosepiece || 0),
      0
  );

    console.log("Final selected medicines before saving:", medicinesWithDetails);

    try {

      
  
    // 🟢 If no phone number is provided, assign default values
    const assignedCustomerName = customerPhone ? customerName : "Walk-in Customers";
    const assignedCustomerPhone = customerPhone || "N/A"; // Placeholder if no phone
    let assignedCustomerId = customerId; // Use existing customer ID if available

    // If no phone is provided, create a new "Walk-in Customer" entry
    if (!customerPhone) {
      
      // Save walk-in customer to Firestore and get an ID
      assignedCustomerId = await saveCustomerToFirestore(assignedCustomerName, assignedCustomerPhone);
    }


    
      // Step 1: Save invoice in Firestore
        const invoiceData = await saveInvoiceToFirestore(
            customerId,
            assignedCustomerName,
            assignedCustomerPhone,
            medicinesWithDetails,  // ✅ Now includes quantity & lossQuantity
            mrpTotal, // ✅ MRP Total Amount
            totalSaving, // ✅ Saving Total Savings
            netPayableAmount, // ✅ Grand Total (already included)
            priceloosepiece,
        );
        
        console.log("✅ Invoice saved successfully:", invoiceData);

        if (invoiceData) {
            console.log("✅ Invoice saved successfully:", invoiceData);
            
            // Step 2: Trigger stock update separately
            await updateStockAfterInvoice(invoiceData.invoiceId);
        }

        setLastInvoice(invoiceData); // Keep the last saved invoice
  setSelectedInvoice(invoiceData); // Store the current invoice


    } catch (error) {
        console.error("❌ Error saving invoice:", error);
    }
  };



  const saveCustomerToFirestore = async (customerName, customerPhone) => {
    try {
      // Prevent saving "Walk-in Customers" in the customers collection
      if (customerName === "Walk-in Customers") {
        return null; // Just return null, don't create an entry
      }

      // Create a new customer for all others
      const newCustomerRef = await addDoc(collection(db, "customers"), {
        name: customerName,
        phone: customerPhone,
        createdAt: new Date().toISOString(),
      });

      return newCustomerRef.id; // Return the new customer ID
    } catch (error) {
      console.error("Error saving customer:", error);
      return null;
    }
  };




  const updateStockAfterInvoice = async (invoiceId) => {
    console.log(`🚀 Updating stock for invoice: ${invoiceId}`);

    try {
        const invoiceRef = doc(db, "sales", invoiceId);    
        const invoiceSnap = await getDoc(invoiceRef);

        if (!invoiceSnap.exists()) {
            console.log("❌ Invoice not found!");
            return;
        }

        const invoiceData = invoiceSnap.data();
        const medicinesSold = invoiceData.medicines || [];

        console.log("📦 Medicines from invoice:", medicinesSold);

        // Step 3: Fetch & update stock in batches
        const batch = writeBatch(db);

        for (const medicine of medicinesSold) {
            if (!medicine.id) continue;

            const medicineRef = doc(db, "medicines", medicine.id);
            const medicineSnap = await getDoc(medicineRef);

            if (!medicineSnap.exists()) {
                console.warn(`⚠️ Medicine not found: ${medicine.name}`);
                continue;
            }

            const medicineData = medicineSnap.data();
            const currentQuantity = Number(medicineData.quantity) || 0;  // Full strips
            const currentLossQuantity = Number(medicineData.lossQuantity) || 0;  // Loose pieces
            const stripSize = Number(medicineData.stripsize) || 1; // Number of pieces per strip
            
            const totalPieces = currentQuantity * stripSize + currentLossQuantity; // Total available pieces

            const soldStrips = Number(medicine.quantity) || 0;
            const soldLoosePieces = Number(medicine.lossQuantity) || 0;

            console.log(`🔹 ${medicine.name} - Stock Before: Strips(${currentQuantity}), Loose(${currentLossQuantity}), TotalPieces(${totalPieces})`);
            console.log(`🛒 Sold: Strips(${soldStrips}), Loose(${soldLoosePieces})`);

            // **Step 1: Reduce total available pieces**
            let remainingTotalPieces = totalPieces - (soldStrips * stripSize) - soldLoosePieces;

            // **Ensure stock doesn’t go negative**
            if (remainingTotalPieces < 0) {
                console.warn(`⚠️ Stock for ${medicine.name} is going negative! Setting to zero.`);
                remainingTotalPieces = 0;
            }

            // **Step 2: Calculate new strip and loose piece quantities**
            const newQuantity = Math.floor(remainingTotalPieces / stripSize);  // Full strips
            const newLossQuantity = remainingTotalPieces % stripSize;  // Loose pieces

            console.log(`✅ Updating ${medicine.name} - Stock After: Strips(${newQuantity}), Loose(${newLossQuantity}), TotalPieces(${remainingTotalPieces})`);

            // **Step 3: Update Firestore with new stock values**
            batch.update(medicineRef, {
                quantity: newQuantity,
                lossQuantity: newLossQuantity,
                totalPieces: remainingTotalPieces,
            });
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
      // fetchCustomerHistory(customerId, setCustomerHistory);
      if (!customerId) {
        alert("No customer selected.");
        return;
      }
      navigate(`/customer/${customerId}`); // Navigate to history page
    };

    useEffect(() => {
      const handlePrint = () => {
        document.querySelectorAll("input").forEach((input) => {
          input.style.display = "inline-block";
        });
      };
    
      window.addEventListener("beforeprint", handlePrint);
      return () => window.removeEventListener("beforeprint", handlePrint);
    }, []);
    
    
    
    return (
      <div className="invoice-page-container container">
        <h1>Invoice Page</h1>

        {/* Mobile Number Search */}
        <div className="customer-info">
          <input className="customer-info"
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
        {/* {customerHistory.length > 0 && (
  
  
  


        {/* Invoice Layout */}
        <div class="invoice-container">
        <div id="invoice-print" >
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
                  <th>Strip Qty</th>
                  <th>Loose Qty</th>
                  <th>Name</th>
                  <th>MRP Strip</th>
                  <th>Price Loose</th>
                  <th>GST %</th>
                  <th>Selling Price Strip</th>
                  <th>Selling Price (Loose)</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedMedicines.map((medicine, index) => (
                  <tr key={medicine.id}>
                    <td>{index + 1}</td>

                    {/* Strip Quantity Input */}
                    <td>
    {window.matchMedia("print").matches ? (
      <span>{medicine.quantity}</span>
    ) : (
      <input
        type="number"
        value={medicine.quantity}
        onChange={(e) =>
          updateQuantity(medicine.id, parseInt(e.target.value, 10) || 0, medicine.lossQuantity)
        }
      />
    )}
  </td>
                  
                    {/* Loose Quantity Input */}
                    <td>
    {window.matchMedia("print").matches ? (
      <span>{medicine.lossQuantity}</span>
    ) : (
      <input
        type="number"
        value={medicine.lossQuantity}
        onChange={(e) =>
          updateQuantity(medicine.id, medicine.quantity, parseInt(e.target.value, 10) || 0)
        }
      />
    )}
  </td>

                    <td>{medicine.name}</td>
                    <td>₹{medicine.mrp}</td>
                    <td>₹{medicine.priceloosepiece}</td>
                    <td>{medicine.gst}</td>
                    <td>₹{medicine.sellingPrice}</td>
                    <td>₹{medicine.sellingPriceLoosePiece}</td>
                  
                    {/* Display Corrected Total Selling Price */}
                    <td>{medicine.totalSellingPrice}</td>
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

          
            <div className="total-price">
              <h5>Total Amount: ₹{mrpTotal.toFixed(2)}</h5>
              <h5>Total Saving: ₹{totalSaving.toFixed(2)}</h5>  
              <h5>Net Payable Amount: ₹{netPayableAmount.toFixed(2)}</h5>
            </div>
            
          </>
        )}

        </div>
        
      </div>
      <button onClick={handleSaveInvoice}>Save Invoice</button>
        <button className="printbutton" onClick={() => window.print()}>Print Invoice</button>

      </div>
    );
  };

  export default InvoicePage;
