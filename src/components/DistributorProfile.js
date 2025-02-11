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
    setPurchases(purchaseData);
  };

  const handleEdit = () => setEditMode(true);

  const handleUpdate = async () => {
    const docRef = doc(db, "distributors", id);
    await updateDoc(docRef, updatedDistributor);
    setDistributor(updatedDistributor);
    setEditMode(false);
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db, "distributors", id));
    navigate("/distributors");
  };

  const addPurchase = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, `distributors/${id}/purchases`), newPurchase);
    setNewPurchase({ billNumber: "", billDate: "", totalBill: "", notes: "", finalPrice: "" });
    fetchPurchases();
  };

  return (
    <div className="container">
      {distributor ? (
        <>
          <h1>Distributor Profile</h1>
          {editMode ? (
            <>
              <input type="text" value={updatedDistributor.name} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, name: e.target.value })} />
              <input type="text" value={updatedDistributor.phone} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, phone: e.target.value })} />
              <input type="text" value={updatedDistributor.gst} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, gst: e.target.value })} />
              <textarea value={updatedDistributor.additionalInfo} onChange={(e) => setUpdatedDistributor({ ...updatedDistributor, additionalInfo: e.target.value })} />
              <button onClick={handleUpdate}>Save</button>
              <button onClick={() => setEditMode(false)}>Cancel</button>
            </>
          ) : (
            <>
              <p>Name: {distributor.name}</p>
              <p>Phone: {distributor.phone}</p>
              <p>GST: {distributor.gst}</p>
              <p>Additional Info: {distributor.additionalInfo}</p>
              <button onClick={handleEdit}>Edit</button>
              <button onClick={() => setDeleteConfirm(true)}>Delete</button>
            </>
          )}
        </>
      ) : <p>Loading...</p>}

      {deleteConfirm && (
        <div className="popup">
          <p>Are you sure you want to delete this distributor?</p>
          <button onClick={handleDelete}>Yes</button>
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

      <table>
        <thead>
          <tr>
            <th>Bill Number</th>
            <th>Date</th>
            <th>Total</th>
            <th>Notes</th>
            <th>Final Price</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td>{purchase.billNumber}</td>
              <td>{purchase.billDate}</td>
              <td>{purchase.totalBill}</td>
              <td>{purchase.notes}</td>
              <td>{purchase.finalPrice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DistributorProfile;
