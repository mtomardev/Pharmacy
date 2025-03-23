import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // Import db from firebase.js
import "./Inventory.css"; // Custom styles for the layout
import ExcelUpload from "./ExcelUpload";
import { useRef } from "react";
import "./General.css";
import updateAllMedicinesWithLossQuantity from "./updateAllMedicinesWithLossQuantity";

const Inventory = () => {
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]); // Filtered medicines based on search
  const [searchTerm, setSearchTerm] = useState(""); // Search input value
  const [editMedicine, setEditMedicine] = useState(null); // ID of the medicine being edited
  const [tempData, setTempData] = useState({}); // Temporary data for editing
  const [showAddForm, setShowAddForm] = useState(false); // For toggling the Add Medicine form
  const [message, setMessage] = useState(""); // For feedback messages
  const [selectedRowIndex, setSelectedRowIndex] = useState(null); // For arrow key navigation
  const [distributors, setDistributors] = useState([]);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(3); // Default to "Name" column


  const distributorRef = useRef(null);
  const nameInputRef = useRef(null);
  
  
  useEffect(() => {
  if (showAddForm) {
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  }
}, [showAddForm]); 



  const fetchDistributors = async () => {
    try {
      
      const querySnapshot = await getDocs(collection(db, "distributors"));
      const distributorData = querySnapshot.docs.map(doc => doc.data().name);
      console.log("Fetched Distributors:", distributorData); // Debugging log
      setDistributors(distributorData);
    } catch (error) {
      console.error("Error fetching distributors:", error);
    }
  };
  


  


  // Fetch medicines from Firestore
  const fetchMedicines = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "medicines"));
      const medicinesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      medicinesData.sort((a, b) => a.name.localeCompare(b.name));
      setMedicines(medicinesData);
      setFilteredMedicines(medicinesData); // Initialize filteredMedicines

    } catch (error) {
      setMessage("Error fetching medicines.");
    }
  };

  const rowRefs = useRef([]);
  const inputRefs = useRef({});

  // Clear tempData when editMedicine changes to null
  useEffect(() => {
    if (editMedicine === null) {
      setTempData({});
    }
  }, [editMedicine]);

  // Filter medicines based on the search term
  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = medicines.filter(
      (medicine) =>
        medicine.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (medicine.salt && typeof medicine.salt === "string" && medicine.salt.toLowerCase().includes(lowerCaseSearchTerm)) // Ensure salt is a string before calling .toLowerCase
    );
    setFilteredMedicines(filtered);
  }, [searchTerm, medicines]);


  useEffect(() => {
    fetchMedicines();
    fetchDistributors(); // ✅ Now this will not get overwritten
  }, []);

  // Keyboard shortcut for Add Medicine (Ctrl + M)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Prevent default browser shortcuts when using Alt + Shift + Key
      if (event.altKey && event.shiftKey && ["m", "e", "s"].includes(event.key)) {
        event.preventDefault();
      }

      // Alt + M → Toggle Add Medicine Form
      if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault(); // Stop browser shortcuts
        setShowAddForm((prevState) => !prevState);
        console.log("Shortcut Alt + M Triggered!");
    }

      // Alt + E → Edit current row
      if (event.altKey && event.key.toLowerCase() === "e" && selectedRowIndex !== null) {
        event.preventDefault(); // Stop browser shortcuts
        const selectedMedicine = filteredMedicines[selectedRowIndex];
        handleEditClick(selectedMedicine, selectedRowIndex);
        setSelectedColumnIndex(1); // Start editing from "HSN Code" column
        console.log("Shortcut Alt + E Triggered!");
    }

      // Alt + S → Save Medicine
      if (event.altKey && event.key.toLowerCase() === "s" && editMedicine !== null) {
        event.preventDefault(); // Prevent browser shortcuts
        saveMedicine(editMedicine, tempData);
        console.log("Shortcut Alt + S Triggered!");
    }

      // Move between rows using Up/Down Arrow keys
      if (!event.altKey && !event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault(); // Prevent page scrolling
        setSelectedRowIndex((prevIndex) => {
          let newIndex =
            event.key === "ArrowUp"
              ? prevIndex === 0 || prevIndex === null
                ? filteredMedicines.length - 1
                : prevIndex - 1
              : prevIndex === filteredMedicines.length - 1 || prevIndex === null
              ? 0
              : prevIndex + 1;

          // Keep the selected column while moving rows
          setSelectedColumnIndex((prevColumn) => prevColumn);

          // Scroll row into view
          rowRefs.current[newIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });

          return newIndex;
        });
      }

      // Ctrl + Left Arrow → Move Left (One Column at a Time)
      if (event.ctrlKey && event.key === "ArrowLeft" && editMedicine !== null) {
        event.preventDefault();
        setSelectedColumnIndex((prevIndex) => {
          const newIndex = prevIndex > 1 ? prevIndex - 1 : 1; // Stop at "HSN Code" column
          focusInput(selectedRowIndex, newIndex);
          return newIndex;
        });
      }

      // Ctrl + Right Arrow → Move Right (One Column at a Time)
      if (event.ctrlKey && event.key === "ArrowRight" && editMedicine !== null) {
        event.preventDefault();
        setSelectedColumnIndex((prevIndex) => {
          const newIndex = prevIndex < 13 ? prevIndex + 1 : 13; // Stop at "H1 Drug" column
          focusInput(selectedRowIndex, newIndex);
          return newIndex;
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
}, [filteredMedicines, selectedRowIndex, editMedicine, tempData]);

  
  
  
  

 

useEffect(() => {
  const handleArrowKeyNavigation = (event) => {
    if (filteredMedicines.length === 0 || editMedicine === null) return;

    // Move between rows (UP/DOWN)
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      setSelectedRowIndex((prevIndex) => {
        let newIndex;

        if (event.key === "ArrowUp") {
          newIndex = prevIndex === null || prevIndex === 0 ? filteredMedicines.length - 1 : prevIndex - 1;
        } else {
          newIndex = prevIndex === null || prevIndex === filteredMedicines.length - 1 ? 0 : prevIndex + 1;
        }

        // Keep the selected column while moving rows
        setSelectedColumnIndex((prevColumn) => prevColumn);

        // Scroll row into view
        rowRefs.current[newIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });

        return newIndex;
      });
    } 
    // Move between columns using Ctrl + Left
    else if (event.ctrlKey && event.key === "ArrowLeft") {
      event.preventDefault();
      setSelectedColumnIndex((prevIndex) => {
        const newIndex = prevIndex > 3 ? prevIndex - 1 : 3; // Prevent moving before "Name" column
        setTimeout(() => focusInput(selectedRowIndex, newIndex), 50); // Ensure smooth focus change
        return newIndex;
      });
    } 
    // Move between columns using Ctrl + Right
    else if (event.ctrlKey && event.key === "ArrowRight") {
      event.preventDefault();
      setSelectedColumnIndex((prevIndex) => {
        const newIndex = prevIndex < 13 ? prevIndex + 1 : 13; // Prevent moving past last column
        setTimeout(() => focusInput(selectedRowIndex, newIndex), 50);
        return newIndex;
      });
    }
  };

  window.addEventListener("keydown", handleArrowKeyNavigation);
  return () => {
    window.removeEventListener("keydown", handleArrowKeyNavigation);
  };
}, [filteredMedicines, editMedicine, selectedRowIndex]);


const focusInput = (rowIndex, columnIndex) => {
  const key = `${rowIndex}-${columnIndex}`;
  if (inputRefs.current[key]) {
    inputRefs.current[key].focus();
  }
};
  

  // Calculate discount based on MRP and Selling Price
  const calculateDiscount = (mrp, sellingPrice) => {
    if (!mrp || !sellingPrice) return 0;
    return ((mrp - sellingPrice) / mrp * 100).toFixed(2);
  };

  // Calculate Selling Price based on MRP and Discount
  const calculateSellingPrice = (mrp, discount) => {
    if (!mrp || discount === undefined) return 0;
    return (mrp - (mrp * discount) / 100).toFixed(2);
  };

  



  // Handle Edit click
  const handleEditClick = (medicine, index) => {
    console.log("Editing medicine:", medicine); // Log the medicine being edited
    if (editMedicine !== medicine.id) {
      setTempData({ ...medicine }); // Reset tempData for new row edit
    }
    setEditMedicine(medicine.id);
    setSelectedRowIndex(index); // Highlight the selected row
  };
  

 
  const saveMedicine = async (id, updatedData = tempData) => {
    try {
      const totalPieces = 
            (parseInt(tempData.quantity) || 0) * (parseInt(tempData.stripsize) || 0) 
            + (parseInt(tempData.lossQuantity) || 0); // ✅ Include loose pieces

      console.log("save", totalPieces)

      const stripsize = parseInt(tempData.stripsize) || 0;  // Default to 0
const mrp = parseFloat(tempData.mrp) || 0;  // Use parseFloat to retain decimals

const priceloosepiece = stripsize > 0 ? (mrp / stripsize).toFixed(2) : "0.00";  


      
      const discount = calculateDiscount(updatedData.mrp, updatedData.sellingPrice);
      const medicineRef = doc(db, "medicines", id);
      
      await updateDoc(medicineRef, {
        ...updatedData, // Use the latest tempData
        discount: parseFloat(discount),
        totalPieces: totalPieces, // ✅ Save updated total pieces
        priceloosepiece: priceloosepiece,
        sellingPriceLoosePiece: parseFloat(updatedData.sellingPriceLoosePiece) || 0,  // ✅ Convert
        gst: parseFloat(updatedData.gst) || 0,  // ✅ Convert
        costPriceLossepiece: parseFloat(updatedData.costPriceLossepiece) || 0,  // ✅ Convert
      });
  
      setMessage("Medicine updated successfully!");
      setEditMedicine(null);
      setTempData({});
      fetchMedicines(); // Refresh list
    } catch (error) {
      setMessage("Error saving medicine.");
    }
  };
   
  

  // Cancel editing and revert to original values
  const cancelEdit = () => {
    setEditMedicine(null); // Clear the edit state
    setTempData({}); // Clear temporary data
  };

  // Add a new medicine to Firestore
  const addMedicine = async (e) => {
    e.preventDefault();
    try {
      const totalPieces = 
      (parseInt(tempData.quantity) || 0) * (parseInt(tempData.stripsize) || 0) 
      + (parseInt(tempData.lossQuantity) || 0); // ✅ Include loose pieces

      console.log("addmedicine", totalPieces)

      const stripsize = parseInt(tempData.stripsize) || 0;  // Default to 0
const mrp = parseFloat(tempData.mrp) || 0;  // Use parseFloat to retain decimals

const priceloosepiece = stripsize > 0 ? (mrp / stripsize).toFixed(2) : "0.00";  


      const discount = calculateDiscount(tempData.mrp, tempData.sellingPrice);

      await addDoc(collection(db, "medicines"), {
        name: tempData.name,
        salt: tempData.salt,
        expiryDate: tempData.expiryDate,
        scheme: tempData.scheme,
        mrp: parseFloat(tempData.mrp) || 0,
        costPrice: parseFloat(tempData.costPrice) || 0,
        costPriceLossepiece: parseFloat(tempData.costPriceLossepiece) || 0,
        sellingPrice: parseFloat(tempData.sellingPrice) || 0,
        discount: parseFloat(discount),
        distributor: tempData.distributor,
        isH1Drug: tempData.isH1Drug || false, // Add isH1Drug field
        hsnCode: tempData.hsnCode, // New field
        batchNo: tempData.batchNo, // New field
        quantity: parseInt(tempData.quantity) || 0,  // Save quantity
        stripsize: tempData.stripsize || 0,
        totalPieces: totalPieces || 0,
        // priceloosepiece: parseFloat(tempData.priceloosepiece) || 0,
        priceloosepiece: priceloosepiece || 0,
        sellingPriceLoosePiece: parseFloat(tempData.sellingPriceLoosePiece) || 0,  // ✅ Convert to number
        lossQuantity: parseInt(tempData.lossQuantity) || 0, 
        gst: parseFloat(tempData.gst) || 0,  // ✅ Convert to number
      });
      setMessage("Medicine added successfully!");
      setShowAddForm(false); // Close the Add Medicine form
      setTempData({}); // Clear tempData after adding
      fetchMedicines(); // Refresh the medicines list
      fetchDistributors(); // Fetch distributors when page loads
    } catch (error) {
      console.error("Error adding medicine:", error);
      setMessage("Error adding medicine: " + error.message);
    
    }
  };

  // Delete a medicine from Firestore
  const deleteMedicine = async (id) => {
    try {
      await deleteDoc(doc(db, "medicines", id));
      setMessage("Medicine deleted successfully!");
      fetchMedicines();
    } catch (error) {
      setMessage("Error deleting medicine.");
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // Clear tempData when Add Medicine form is toggled open
  const toggleAddForm = () => {
  setTempData({});
  setShowAddForm((prevState) => {
    if (!prevState) {
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100); // Small delay to ensure focus works
    }
    return !prevState;
  });
};


//Expiry check
  const checkExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
   // If the medicine is expired or will expire in the next 30 days
   if (diffTime < 0) {
    return 'expired';
  } else if (diffTime <= 30 * 24 * 60 * 60 * 1000) { // 30 days
    return 'near-expiry';
  } else {
    return 'valid';
  }
};




  return (
    <div className="inventory-container container">
      <h1 className="page-title">Pharmacy Management</h1>

      {message && <div className="message">{message}</div>}

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by medicine name or salt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Toggle Add Medicine Form Button */}
      <button onClick={toggleAddForm} className="btn-toggle-form">
        {showAddForm ? "Close Add Medicine Form" : "Add Medicine"}
      </button>

      <ExcelUpload />

      {/* Add Medicine Form */}
      {showAddForm && (
        <div className="form-container">
          <h2>Add New Medicine</h2>
          <form onSubmit={addMedicine}>
            {/* Form inputs for adding a new medicine */}
            <div className="form-group">
              <label>Name:</label>
              <input
                ref={nameInputRef} // Attach ref here
                type="text"
                value={tempData.name || ""}
                onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                required
              />

            </div>
            <div className="form-group">
              <label>Salt:</label>
              <input
                type="text"
                value={tempData.salt || ""}
                onChange={(e) => setTempData({ ...tempData, salt: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>HSN Code:</label>
              <input
                type="text"
                value={tempData.hsnCode || ""}
                onChange={(e) => setTempData({ ...tempData, hsnCode: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Batch No:</label>
              <input
                type="text"
                value={tempData.batchNo || ""}
                onChange={(e) => setTempData({ ...tempData, batchNo: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Quantity:</label>
              <input
                type="number"
                value={tempData.quantity || ""}
                onChange={(e) => setTempData({ ...tempData, quantity: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Exp:</label>
              <input
                type="date"
                value={tempData.expiryDate || ""}
                onChange={(e) => setTempData({ ...tempData, expiryDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Scheme:</label>
              <input
                type="text"
                value={tempData.scheme || ""}
                onChange={(e) => setTempData({ ...tempData, scheme: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>MRP:</label>
              <input
                type="number"
                value={tempData.mrp || ""}
                onChange={(e) => setTempData({ ...tempData, mrp: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Cost Price:</label>
              <input
                type="number"
                value={tempData.costPrice || ""}
                onChange={(e) => setTempData({ ...tempData, costPrice: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Selling Price:</label>
              <input
                type="number"
                value={tempData.sellingPrice || ""}
                onChange={(e) => {
                  const sellingPrice = parseFloat(e.target.value);
                  const discount = calculateDiscount(tempData.mrp, sellingPrice);
                  setTempData({ ...tempData, sellingPrice, discount });
                }}
                required
              />
            </div>
            <div className="form-group">
              <label>Discount (%):</label>
              <input
                type="number"
                value={tempData.discount || ""}
                onChange={(e) => {
                  const discount = parseFloat(e.target.value);
                  const sellingPrice = calculateSellingPrice(tempData.mrp, discount);
                  setTempData({ ...tempData, discount, sellingPrice });
                }}
                required
              />
            </div>

            <div className="form-group">
  <label>Distributor:</label>
  <select
  ref={distributorRef}
  value={tempData.distributor || ""}
  onChange={(e) => setTempData({ ...tempData, distributor: e.target.value })}
  onFocus={(e) => {
    setTimeout(() => {
      e.target.size = distributors.length > 5 ? 5 : distributors.length; // Expand dropdown
    }, 50);
  }}
  onBlur={(e) => {
    setTimeout(() => {
      e.target.size = 1; // Collapse dropdown when losing focus
    }, 200);
  }}
  onKeyDown={(e) => {
    if (["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) {
      e.stopPropagation(); // Prevents interference with medicine list
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); // Stop page scrolling & external key events
      const options = Array.from(e.target.options);
      const selectedIndex = options.findIndex(opt => opt.selected);
      let newIndex = e.key === "ArrowDown" ? selectedIndex + 1 : selectedIndex - 1;
      newIndex = Math.max(1, Math.min(newIndex, options.length - 1)); // Keep within bounds
      options[newIndex].selected = true;
      setTempData({ ...tempData, distributor: options[newIndex].value });
    }
  }}
>
  <option value="">Select Distributor</option>
  {distributors.map((dist, index) => (
    <option key={index} value={dist}>
      {dist}
    </option>
  ))}
</select>

</div>


            <div className="form-group">
  <label className="h1-drug-label">
    H1 Drug:
    <input
      type="checkbox"
      className="h1-drug-checkbox"
      checked={tempData.isH1Drug || false}
      onChange={(e) => setTempData({ ...tempData, isH1Drug: e.target.checked })}
    />
  </label>
</div>

            <button type="submit" className="btn-submit">Add Medicine</button>
          </form>
        </div>
      )}

      <h2>Medicines List</h2>
      <div className="medicine-table-container">
        <table className="medicine-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>HSN Code</th>
              <th>Batch No</th>
              <th>Name</th>
              <th>Salt</th>
              <th>Quantity</th>
              <th>Strip Size</th>
              <th>Total Qty (Pieces)</th>
              <th>Loose Qty</th>
              <th>Loose Pieces MRP</th>
              <th>Exp</th>
              <th>Scheme</th>
              <th>MRP</th>
              <th>Cost Price</th>
              <th>Cost Price Losse piece</th>
              <th>GST (%)</th>
              <th>Discount (%)</th>
              <th>Selling Price Strip</th>
              <th>Selling Price Loose Piece</th>
              <th>Distributor</th>
              <th>H1 Drug</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedicines.map((medicine, index) => (
              <tr
              ref={(el) => (rowRefs.current[index] = el)}
              key={medicine.id}
              className={`${selectedRowIndex === index ? "selected-row" : ""} ${
                medicine.isH1Drug ? "highlight-h1" : ""
              } ${checkExpiryStatus(medicine.expiryDate) === 'expired' ? 'expired' : ''} 
                ${checkExpiryStatus(medicine.expiryDate) === 'near-expiry' ? 'near-expiry' : ''}`}
            >
                <td>{index + 1}</td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-1`] = el)} // Store reference for column 1
                      type="text"
                      value={tempData.hsnCode || ""}
                      onChange={(e) => setTempData({ ...tempData, hsnCode: e.target.value })}
                      autoFocus={selectedColumnIndex === 1} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.hsnCode
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      ref={(el) => (inputRefs.current[`${index}-2`] = el)} // Store reference for column 2
                      type="text"
                      value={tempData.batchNo || ""}
                      onChange={(e) => setTempData({ ...tempData, batchNo: e.target.value })}
                      autoFocus={selectedColumnIndex === 2} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.batchNo
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-3`] = el)} // Store reference for column 3
                    type="text"
                    value={tempData.name || ""}
                    onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                    autoFocus={selectedColumnIndex === 3} // Ensure focus starts here
                  />
                  ) : (
                    medicine.name
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      ref={(el) => (inputRefs.current[`${index}-4`] = el)}
                      type="text"
                      value={tempData.salt || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, salt: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.salt
                  )}
                </td>

                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-5`] = el)}
                    type="number"
                    value={tempData.quantity || ""}
                    onChange={(e) =>{
                      const quantity = parseInt(e.target.value) || 0;
                    setTempData({ ...tempData, quantity })
              }}
              autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
            />
            ) : (
              medicine.quantity
            )}
            </td>

            <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-5`] = el)}
                    type="number"
                    value={tempData.stripsize || ""}
                    onChange={(e) =>{
                      const stripsize = parseInt(e.target.value) || 0;
                    setTempData({ ...tempData, stripsize })
                  }}
              autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
            />
            ) : (
              medicine.stripsize
            )}
            </td>

            <td>{medicine.totalPieces || 0}</td>

            

            <td>
              {/* loose qty */}
              {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-5`] = el)}
                    type="number"
                    value={tempData.lossQuantity ?? 0}  // ✅ Ensures default is 0
                    onChange={(e) =>{
                      const lossQuantity = parseInt(e.target.value) || 0;
                    setTempData({ ...tempData, lossQuantity })
              }}
              autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
            />
            ) : (
              medicine.lossQuantity ?? 0 // ✅ Ensures display is 0 if undefined
            )}
            </td>
          

            {/* <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-5`] = el)}
                    type="number"
                    value={tempData.priceloosepiece || ""}
                    onChange={(e) =>{
                      const priceloosepiece = parseFloat(e.target.value) || 0;
                    setTempData({ ...tempData, priceloosepiece })
                  }}
              autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
            />
            ) : (
              medicine.priceloosepiece
            )}
            </td> */}

<td>{Number(medicine.priceloosepiece || 0).toFixed(2)}</td>



                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      ref={(el) => (inputRefs.current[`${index}-6`] = el)}
                      type="date"
                      value={tempData.expiryDate || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, expiryDate: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.expiryDate
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      ref={(el) => (inputRefs.current[`${index}-7`] = el)}
                      type="text"
                      value={tempData.scheme || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, scheme: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.scheme
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-8`] = el)}
                      type="number"
                      value={tempData.mrp || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, mrp: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.mrp
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-9`] = el)}
                      type="number"
                      value={tempData.costPrice || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, costPrice: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.costPrice
                  )}
                </td>
                

                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-9`] = el)}
                      type="number"
                      value={tempData.costPriceLossepiece || 0}
                      onChange={(e) =>
                        setTempData({ ...tempData, costPriceLossepiece: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.costPriceLossepiece
                  )}
                </td>
                 
                  {/* GST% */}
                <td>
                {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-9`] = el)}
                      type="number"
                      value={tempData.gst || 0}
                      onChange={(e) =>
                        setTempData({ ...tempData, gst: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.gst
                  )}
                </td>



                <td>
                {/* allows users to edit the discount field of a medicine when editMedicine matches the medicine.id */}
                {/* If editMedicine equals medicine.id, the input field is shown.
                Otherwise, it just displays the discount value (medicine.discount). */}
                  
                  {editMedicine === medicine.id ? (  
                    <input
                    // ref for Keyboard Navigation
                    ref={(el) => (inputRefs.current[`${index}-10`] = el)}
                      type="number"
                      value={tempData.discount || ""}
                      onChange={(e) => {
                        // When the user types a discount, it updates tempData.discount.
                        const discount = parseFloat(e.target.value);
                        // It then calculates the new selling price using calculateSellingPrice().
                        const sellingPrice = calculateSellingPrice(
                          tempData.mrp,
                          discount
                        );
                        // setTempData({...tempData, discount, sellingPrice}) updates the temporary state.
                        setTempData({ ...tempData, discount, sellingPrice });
                      }}
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.discount
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-11`] = el)}                      type="number"
                      value={tempData.sellingPrice || ""}
                      onChange={(e) => {
                        const sellingPrice = parseFloat(e.target.value);
                        const discount = calculateDiscount(
                          tempData.mrp,
                          sellingPrice
                        );
                        setTempData({ ...tempData, sellingPrice, discount });
                      }}
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.sellingPrice
                  )}
                </td>

                {/* selling price lose iece */}
                
                <td>
                {editMedicine === medicine.id ? (
                    <input
                    ref={(el) => (inputRefs.current[`${index}-9`] = el)}
                      type="number"
                      value={tempData.sellingPriceLoosePiece || 0}
                      onChange={(e) =>
                        setTempData({ ...tempData, sellingPriceLoosePiece: e.target.value })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.sellingPriceLoosePiece
                  )}
                </td>

                <td>
  {editMedicine === medicine.id ? (
    <>
        <select
  ref={distributorRef}
  value={tempData.distributor || ""}
  onChange={(e) => setTempData({ ...tempData, distributor: e.target.value })}
  onFocus={(e) => {
    setTimeout(() => {
      e.target.size = distributors.length > 5 ? 5 : distributors.length; // Expand dropdown
    }, 50);
  }}
  onBlur={(e) => {
    setTimeout(() => {
      e.target.size = 1; // Collapse dropdown when losing focus
    }, 200);
  }}
  onKeyDown={(e) => {
    if (["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) {
      e.stopPropagation(); // Prevents interference with medicine list
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); // Stop page scrolling & external key events
      const options = Array.from(e.target.options);
      const selectedIndex = options.findIndex(opt => opt.selected);
      let newIndex = e.key === "ArrowDown" ? selectedIndex + 1 : selectedIndex - 1;
      newIndex = Math.max(1, Math.min(newIndex, options.length - 1)); // Keep within bounds
      options[newIndex].selected = true;
      setTempData({ ...tempData, distributor: options[newIndex].value });
    }
  }}
>
  <option value="">Select Distributor</option>
  {distributors.map((dist, index) => (
    <option key={index} value={dist}>
      {dist}
    </option>
  ))}
</select>
  
    </>
  ) : (
    medicine.distributor
  )}
</td>



            
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="checkbox"
                      checked={tempData.isH1Drug || false}
                      onChange={(e) =>
                        setTempData({ ...tempData, isH1Drug: e.target.checked })
                      }
                      autoFocus={selectedColumnIndex === 4} // Moves focus when using Arrow keys
                    />
                  ) : (
                    medicine.isH1Drug ? "Yes" : "No"
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <>
                      <button
                        onClick={() => saveMedicine(medicine.id)}
                        className="btn-submit"
                      >
                        Save
                      </button>
                      <button onClick={cancelEdit} className="btn-delete">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditClick(medicine, index)}
                        className="btn-edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMedicine(medicine.id)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
