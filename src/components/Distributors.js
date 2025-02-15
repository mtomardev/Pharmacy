import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
// import "./distributor.css";
import "./General.css";



const Distributors = () => {
  const [distributors, setDistributors] = useState([]);
  const [newDistributor, setNewDistributor] = useState({ name: "", phone: "", gst: "", additionalInfo: "" });
  const [deleteDistributorId, setDeleteDistributorId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDistributors();
  }, []);

  const fetchDistributors = async () => {
    const querySnapshot = await getDocs(collection(db, "distributors"));
    const distributorData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    distributorData.sort((a, b) => a.name.localeCompare(b.name));
    setDistributors(distributorData);
  };

  const addDistributor = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "distributors"), newDistributor);
    setNewDistributor({ name: "", phone: "", gst: "", additionalInfo: "" });
    fetchDistributors();
  };

  const confirmDeleteDistributor = (id) => {
    setDeleteDistributorId(id);
  };

  const deleteDistributor = async () => {
    await deleteDoc(doc(db, "distributors", deleteDistributorId));
    setDeleteDistributorId(null);
    fetchDistributors();
  };

  return (
    <div className="container">
      <h1 className="title">Distributors</h1>
      <div className="card">
      <form onSubmit={addDistributor}>
        <input type="text" placeholder="Name" value={newDistributor.name} onChange={(e) => setNewDistributor({ ...newDistributor, name: e.target.value })} required />
        <input type="text" placeholder="Phone" value={newDistributor.phone} onChange={(e) => setNewDistributor({ ...newDistributor, phone: e.target.value })} required />
        <input type="text" placeholder="GST" value={newDistributor.gst} onChange={(e) => setNewDistributor({ ...newDistributor, gst: e.target.value })} />
        <input type="text" placeholder="Additional Info" value={newDistributor.additionalInfo} onChange={(e) => setNewDistributor({ ...newDistributor, additionalInfo: e.target.value })} />
        <button type="submit">Add Distributor</button>
      </form>
      </div>
      <table className="styled-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Name</th>
            <th>Phone</th>
            <th>View</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {distributors.map((dist, index) => (
            <tr key={dist.id}>
              <td>{index + 1}</td>
              <td>{dist.name}</td>
              <td>{dist.phone}</td>
              <td><button className="btn-view" onClick={() => navigate(`/distributor/${dist.id}`)}>View</button></td>
              <td><button className="btn-delete" onClick={() => confirmDeleteDistributor(dist.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {deleteDistributorId && (
        <div className="popup">
          <p>Are you sure you want to delete this distributor?</p>
          <button className="btn-confirm" onClick={deleteDistributor}>Yes</button>
          
          <button className="btn-cancel" onClick={() => setDeleteDistributorId(null)}>No</button>
        </div>
      )}
    </div>
  );
};

export default Distributors;
