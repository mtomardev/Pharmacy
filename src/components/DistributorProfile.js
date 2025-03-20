

import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

const DistributorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [distributor, setDistributor] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedDistributor, setUpdatedDistributor] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [newPurchase, setNewPurchase] = useState({ billNumber: "", billDate: "", totalBill: "", notes: "", finalPrice: "" });
  const [editIndex, setEditIndex] = useState(null);
  const [editedPurchase, setEditedPurchase] = useState({});
  const [deletePurchaseId, setDeletePurchaseId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  
  useEffect(() => {
    fetchDistributor();
    fetchPurchases();
  }, []);

  const fetchDistributor = async () => {
    const docRef = doc(db, "distributors", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setDistributor(docSnap.data());
      setUpdatedDistributor(docSnap.data());
    }
  };

  

  const fetchPurchases = async () => {
    const querySnapshot = await getDocs(collection(db, `distributors/${id}/purchases`));
    const purchaseData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
    // Sorting purchases by billDate in descending order
    purchaseData.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
  
     // Extract unique years from the purchases
     const years = [...new Set(purchaseData.map((purchase) => new Date(purchase.billDate).getFullYear()))];
     setAvailableYears(years);



    // Filter by selected month and year
    const filteredPurchases = purchaseData.filter((purchase) => {
      const purchaseDate = new Date(purchase.billDate);
      const purchaseMonth = String(purchaseDate.getMonth() + 1).padStart(2, '0');
      const purchaseYear = purchaseDate.getFullYear().toString();
  
      const matchesMonth = selectedMonth ? purchaseMonth === selectedMonth : true;
      const matchesYear = selectedYear ? purchaseYear === selectedYear : true;
  
      return matchesMonth && matchesYear;
    });
  
    // Set the state with the filtered purchases
    setPurchases(filteredPurchases);
  };
  

  useEffect(() => {
    fetchPurchases();
  }, [selectedMonth, selectedYear]);
  
  

  const handleEditDistributor = () => setEditMode(true);

  const handleUpdateDistributor = async () => {
    const docRef = doc(db, "distributors", id);
    await updateDoc(docRef, updatedDistributor);
    setDistributor(updatedDistributor);
    setEditMode(false);
  };

  const handleDeleteDistributor = async () => {
    await deleteDoc(doc(db, "distributors", id));
    navigate("/distributors");
  };

  const addPurchase = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, `distributors/${id}/purchases`), newPurchase);
    setNewPurchase({ billNumber: "", billDate: "", totalBill: "", notes: "", finalPrice: "" });
    fetchPurchases();
  };

  const handleEditPurchase = (purchase, index) => {
    setEditIndex(index);
    setEditedPurchase(purchase);
  };

  const saveEditedPurchase = async (purchaseId) => {
    const docRef = doc(db, `distributors/${id}/purchases`, purchaseId);
    await updateDoc(docRef, editedPurchase);
    fetchPurchases();
    setEditIndex(null);
  };

  const confirmDeletePurchase = (purchaseId) => {
    setDeletePurchaseId(purchaseId);
  };

  const handleDeletePurchase = async () => {
    if (deletePurchaseId) {
      await deleteDoc(doc(db, `distributors/${id}/purchases`, deletePurchaseId));
      fetchPurchases();
      setDeletePurchaseId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`; // Format as 'DD/MM/YYYY'
  };

  return (
    <div className="container">
      {distributor ? (
        <>
          <h1 className="title">Distributor Profile</h1>
          {editMode ? (
            <div className="card">
              <input type="text" value={updatedDistributor.name} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, name: e.target.value })} />
              <input type="text" value={updatedDistributor.phone} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, phone: e.target.value })} />
              <input type="text" value={updatedDistributor.gst} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, gst: e.target.value })} />
              <textarea value={updatedDistributor.additionalInfo} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, additionalInfo: e.target.value })} />
              <button onClick={handleUpdateDistributor}>Save</button>
              <button onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <p>Name: {distributor.name}</p>
              <p>Phone: {distributor.phone}</p>
              <p>GST: {distributor.gst}</p>
              <p>Additional Info: {distributor.additionalInfo}</p>
              <button onClick={handleEditDistributor}>Edit</button>
              <button onClick={() => setDeleteConfirm(true)}>Delete</button>
            </>
          )}
        </>
      ) : <p>Loading...</p>}

      {deleteConfirm && (
        <div className="popup">
          <p>Are you sure you want to delete this distributor?</p>
          <button onClick={handleDeleteDistributor}>Yes</button>
          <button onClick={() => setDeleteConfirm(false)}>No</button>
        </div>
      )}

      <h2>Purchase History</h2>
      <form onSubmit={addPurchase}>
        <input type="text" placeholder="Bill Number" value={newPurchase.billNumber} onChange={(e) => setNewPurchase({ ...newPurchase, billNumber: e.target.value })} required />
        <input type="date" value={newPurchase.billDate} onChange={(e) => setNewPurchase({ ...newPurchase, billDate: e.target.value })} required />
        <input type="number" placeholder="Total Bill" value={newPurchase.totalBill} onChange={(e) => setNewPurchase({ ...newPurchase, totalBill: e.target.value })} required />
        <textarea placeholder="Notes" value={newPurchase.notes} onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })} />
        <input type="number" placeholder="Final Price" value={newPurchase.finalPrice} onChange={(e) => setNewPurchase({ ...newPurchase, finalPrice: e.target.value })} />
        <button type="submit">Add Purchase</button>
      </form>
      
       {/* Filter by Month */}
      <div>
  <label>Filter by Month: </label>
  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
    <option value="">All Months</option>
    <option value="01">January</option>
    <option value="02">February</option>
    <option value="03">March</option>
    <option value="04">April</option>
    <option value="05">May</option>
    <option value="06">June</option>
    <option value="07">July</option>
    <option value="08">August</option>
    <option value="09">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  </select>
</div>

{/* Filter by Year */}
    <div>
        <label>Filter by Year: </label>
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          <option value="">All Years</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <table className="styled-table">
        <thead>
          <tr>
            <th>Bill Number</th>
            <th>Date</th>
            <th>Total</th>
            <th>Notes</th>
            <th>Final Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase, index) => (
            <tr key={purchase.id}>
              <td>{editIndex === index ? <input type="text" value={editedPurchase.billNumber} onChange={(e) => setEditedPurchase({ ...editedPurchase, billNumber: e.target.value })} /> : purchase.billNumber}</td>
              <td>{editIndex === index ? <input type="date" value={editedPurchase.billDate} onChange={(e) => setEditedPurchase({ ...editedPurchase, billDate: e.target.value })} /> : formatDate(purchase.billDate)}</td>

              <td>{editIndex === index ? <input type="number" value={editedPurchase.totalBill} onChange={(e) => setEditedPurchase({ ...editedPurchase, totalBill: e.target.value })} /> : purchase.totalBill}</td>
              <td>{editIndex === index ? <textarea value={editedPurchase.notes} onChange={(e) => setEditedPurchase({ ...editedPurchase, notes: e.target.value })} /> : purchase.notes}</td>
              <td>{editIndex === index ? <input type="number" value={editedPurchase.finalPrice} onChange={(e) => setEditedPurchase({ ...editedPurchase, finalPrice: e.target.value })} /> : purchase.finalPrice}</td>
              <td>
                {editIndex === index ? <><button onClick={() => saveEditedPurchase(purchase.id)}>Save</button><button onClick={() => setEditIndex(null)}>Cancel</button></> : <><button onClick={() => handleEditPurchase(purchase, index)}>Edit</button><button onClick={() => confirmDeletePurchase(purchase.id)}>Delete</button></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deletePurchaseId && (
        <div className="popup">
          <p>Are you sure you want to delete this purchase?</p>
          <button onClick={handleDeletePurchase}>Yes</button>
          <button onClick={() => setDeletePurchaseId(null)}>No</button>
        </div>
      )}
    </div>
  );
};

export default DistributorProfile;


