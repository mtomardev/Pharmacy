import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const Distributors = () => {
  const [distributors, setDistributors] = useState([]);
  const [newDistributor, setNewDistributor] = useState({ name: "", phone: "", gst: "", additionalInfo: "" });
  const [deleteDistributorId, setDeleteDistributorId] = useState(null);

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
      <h1>Distributors</h1>
      <form onSubmit={addDistributor}>
        <input type="text" placeholder="Name" value={newDistributor.name} onChange={(e) => setNewDistributor({ ...newDistributor, name: e.target.value })} required />
        <input type="text" placeholder="Phone" value={newDistributor.phone} onChange={(e) => setNewDistributor({ ...newDistributor, phone: e.target.value })} required />
        <input type="text" placeholder="GST" value={newDistributor.gst} onChange={(e) => setNewDistributor({ ...newDistributor, gst: e.target.value })} />
        <input type="text" placeholder="Additional Info" value={newDistributor.additionalInfo} onChange={(e) => setNewDistributor({ ...newDistributor, additionalInfo: e.target.value })} />
        <button type="submit">Add Distributor</button>
      </form>
      <table>
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
              <td><button>View</button></td>
              <td><button onClick={() => confirmDeleteDistributor(dist.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {deleteDistributorId && (
        <div className="popup">
          <p>Are you sure you want to delete this distributor?</p>
          <button onClick={deleteDistributor}>Yes</button>
          <button onClick={() => setDeleteDistributorId(null)}>No</button>
        </div>
      )}
    </div>
  );
};

export default Distributors;
