import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // Import db from firebase.js
import "./Inventory.css"; // Custom styles for the layout
import ExcelUpload from "./ExcelUpload";

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

       // Extract unique distributors
    const distributorSet = new Set(medicinesData.map((med) => med.distributor).filter(Boolean));
    setDistributors([...distributorSet]); 
    } catch (error) {
      setMessage("Error fetching medicines.");
    }
  };

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

  // Keyboard shortcut for Add Medicine (Ctrl + M)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "m") {
        setShowAddForm((prevState) => !prevState); // Toggle form visibility on Ctrl + M
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Handle arrow key navigation
  useEffect(() => {
    const handleArrowKeyNavigation = (event) => {
      if (filteredMedicines.length === 0 || editMedicine !== null) return;

      if (event.key === "ArrowUp") {
        setSelectedRowIndex((prevIndex) =>
          prevIndex === null || prevIndex === 0
            ? filteredMedicines.length - 1
            : prevIndex - 1
        );
      } else if (event.key === "ArrowDown") {
        setSelectedRowIndex((prevIndex) =>
          prevIndex === null || prevIndex === filteredMedicines.length - 1
            ? 0
            : prevIndex + 1
        );
      }
    };

    window.addEventListener("keydown", handleArrowKeyNavigation);

    return () => {
      window.removeEventListener("keydown", handleArrowKeyNavigation);
    };
  }, [filteredMedicines, editMedicine]);

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
  

  // Save updated medicine data to Firestore
  const saveMedicine = async (id) => {
    try {
      const discount = calculateDiscount(tempData.mrp, tempData.sellingPrice);
      console.log("Saving data:", tempData); // Log tempData before saving
      const medicineRef = doc(db, "medicines", id);
      await updateDoc(medicineRef, {
        name: tempData.name,
        salt: tempData.salt,
        expiryDate: tempData.expiryDate,
        scheme: tempData.scheme,
        mrp: parseFloat(tempData.mrp),
        costPrice: parseFloat(tempData.costPrice),
        sellingPrice: parseFloat(tempData.sellingPrice),
        discount: parseFloat(discount),
        distributor: tempData.distributor,
        isH1Drug: tempData.isH1Drug || false,
        hsnCode: tempData.hsnCode,
        batchNo: tempData.batchNo,
        quantity: parseInt(tempData.quantity) || 0, // Save quantity
      });
      console.log("Medicine updated successfully!");
      setMessage("Medicine updated successfully!");
      setEditMedicine(null); // Clear the edit state
      setTempData({}); // Clear tempData after saving
      fetchMedicines(); // Refresh the medicines list
    } catch (error) {
      console.error("Error saving medicine:", error); // Log any errors during the save
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
      const discount = calculateDiscount(tempData.mrp, tempData.sellingPrice);
      await addDoc(collection(db, "medicines"), {
        name: tempData.name,
        salt: tempData.salt,
        expiryDate: tempData.expiryDate,
        scheme: tempData.scheme,
        mrp: parseFloat(tempData.mrp),
        costPrice: parseFloat(tempData.costPrice),
        sellingPrice: parseFloat(tempData.sellingPrice),
        discount: parseFloat(discount),
        distributor: tempData.distributor,
        isH1Drug: tempData.isH1Drug || false, // Add isH1Drug field
        hsnCode: tempData.hsnCode, // New field
        batchNo: tempData.batchNo, // New field
        quantity: parseInt(tempData.quantity) || 0,  // Save quantity
      });
      setMessage("Medicine added successfully!");
      setShowAddForm(false); // Close the Add Medicine form
      setTempData({}); // Clear tempData after adding
      fetchMedicines(); // Refresh the medicines list
    } catch (error) {
      setMessage("Error adding medicine.");
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
    setTempData({}); // Clear tempData when opening the Add Medicine form
    setShowAddForm((prevState) => !prevState);
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
    <div className="inventory-container">
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
    value={tempData.distributor || ""}
    onChange={(e) => setTempData({ ...tempData, distributor: e.target.value })}
  >
    <option value="">Select Distributor</option>
    {distributors.map((dist, index) => (
      <option key={index} value={dist}>
        {dist}
      </option>
    ))}
  </select>
  <input
    type="text"
    placeholder="Or enter new distributor"
    value={tempData.distributor || ""}
    onChange={(e) => setTempData({ ...tempData, distributor: e.target.value })}
  />
              
              {/* <input
                type="text"
                value={tempData.distributor || ""}
                onChange={(e) => setTempData({ ...tempData, distributor: e.target.value })}
                required
              /> */}
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
              <th>Exp</th>
              <th>Scheme</th>
              <th>MRP</th>
              <th>Cost Price</th>
              <th>Discount (%)</th>
              <th>Selling Price</th>
              <th>Distributor</th>
              <th>H1 Drug</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedicines.map((medicine, index) => (
              <tr
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
                      type="text"
                      value={tempData.hsnCode || ""}
                      onChange={(e) => setTempData({ ...tempData, hsnCode: e.target.value })}
                    />
                  ) : (
                    medicine.hsnCode
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="text"
                      value={tempData.batchNo || ""}
                      onChange={(e) => setTempData({ ...tempData, batchNo: e.target.value })}
                    />
                  ) : (
                    medicine.batchNo
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    type="text"
                    value={tempData.name || ""}
                    onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                  />
                  ) : (
                    medicine.name
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="text"
                      value={tempData.salt || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, salt: e.target.value })
                      }
                    />
                  ) : (
                    medicine.salt
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                    type="number"
                    value={tempData.quantity || ""}
                    onChange={(e) =>
                    setTempData({ ...tempData, quantity: e.target.value })
              }
            />
            ) : (
              medicine.quantity
            )}
            </td>

                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="date"
                      value={tempData.expiryDate || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, expiryDate: e.target.value })
                      }
                    />
                  ) : (
                    medicine.expiryDate
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="text"
                      value={tempData.scheme || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, scheme: e.target.value })
                      }
                    />
                  ) : (
                    medicine.scheme
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="number"
                      value={tempData.mrp || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, mrp: e.target.value })
                      }
                    />
                  ) : (
                    medicine.mrp
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="number"
                      value={tempData.costPrice || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, costPrice: e.target.value })
                      }
                    />
                  ) : (
                    medicine.costPrice
                  )}
                </td>
                
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="number"
                      value={tempData.discount || ""}
                      onChange={(e) => {
                        const discount = parseFloat(e.target.value);
                        const sellingPrice = calculateSellingPrice(
                          tempData.mrp,
                          discount
                        );
                        setTempData({ ...tempData, discount, sellingPrice });
                      }}
                    />
                  ) : (
                    medicine.discount
                  )}
                </td>
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="number"
                      value={tempData.sellingPrice || ""}
                      onChange={(e) => {
                        const sellingPrice = parseFloat(e.target.value);
                        const discount = calculateDiscount(
                          tempData.mrp,
                          sellingPrice
                        );
                        setTempData({ ...tempData, sellingPrice, discount });
                      }}
                    />
                  ) : (
                    medicine.sellingPrice
                  )}
                </td>

                <td>
  {editMedicine === medicine.id ? (
    <>
      <select
        value={tempData.distributor || ""}
        onChange={(e) => setTempData({ ...tempData, distributor: e.target.value })}
      >
        <option value="">Select Distributor</option>
        {distributors.map((dist, index) => (
          <option key={index} value={dist}>
            {dist}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Or enter new distributor"
        value={tempData.distributor || ""}
        onChange={(e) => setTempData({ ...tempData, distributor: e.target.value })}
      />
    </>
  ) : (
    medicine.distributor
  )}
</td>



                {/* <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="text"
                      value={tempData.distributor || ""}
                      onChange={(e) =>
                        setTempData({ ...tempData, distributor: e.target.value })
                      }
                    />
                  ) : (
                    medicine.distributor
                  )}
                </td> */}
                <td>
                  {editMedicine === medicine.id ? (
                    <input
                      type="checkbox"
                      checked={tempData.isH1Drug || false}
                      onChange={(e) =>
                        setTempData({ ...tempData, isH1Drug: e.target.checked })
                      }
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
