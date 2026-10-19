import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import "./General.css";

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [newExpense, setNewExpense] = useState({ date: "", category: "", name: "", description: "", amount: "" });
  const predefinedCategories = ["Rent", "Salary", "Bills", "Miscellaneous"];

  useEffect(() => {
    const fetchExpenses = async () => {
      const querySnapshot = await getDocs(collection(db, "expenses"));
      const expensesData = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          date: docData.date ? new Date(docData.date) : new Date() // Default to today if invalid

        };
      });
      setExpenses(expensesData);
      setFilteredExpenses(expensesData);
    };
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [filter, expenses, customRange]);

  const filterExpenses = () => {
    const today = new Date();
    let filtered = expenses;

    if (filter === "daily") {
      filtered = expenses.filter(exp => 
        exp.date instanceof Date && 
        !isNaN(exp.date) && 
        exp.date.toISOString().split("T")[0] === today.toISOString().split("T")[0]
      );
      
    } else if (filter === "weekly") {
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      filtered = expenses.filter(exp => exp.date instanceof Date && !isNaN(exp.date) && exp.date >= lastWeek);
    } else if (filter === "monthly") {
      filtered = expenses.filter(exp => exp.date instanceof Date && !isNaN(exp.date) && exp.date.getMonth() === today.getMonth() && exp.date.getFullYear() === today.getFullYear());
    } else if (filter === "yearly") {
      filtered = expenses.filter(exp => exp.date instanceof Date && !isNaN(exp.date) && exp.date.getFullYear() === today.getFullYear());
    } else if (filter === "custom") {
      const startDate = new Date(customRange.start);
      const endDate = new Date(customRange.end);
      filtered = expenses.filter(exp => exp.date instanceof Date && !isNaN(exp.date) && exp.date >= startDate && exp.date <= endDate);
    }
    setFilteredExpenses(filtered);
  };

  const calculateTotalExpenses = () => {
    return filteredExpenses.reduce((total, exp) => total + parseFloat(exp.amount || 0), 0);
  };

  const handleAddExpense = async () => {
    if (!newExpense.date || !newExpense.category || !newExpense.name || !newExpense.amount) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "expenses"), { ...newExpense, date: new Date(newExpense.date).toISOString() });
      setExpenses([...expenses, { id: docRef.id, ...newExpense, date: new Date(newExpense.date) }]);
      setNewExpense({ date: "", category: "", name: "", description: "", amount: "" });
    } catch (error) {
      console.error("Error adding expense: ", error);
    }
  };

  const handleEditChange = (e, id, field) => {
    setExpenses(expenses.map(exp => (exp.id === id ? { ...exp, [field]: e.target.value } : exp)));
  };

  const handleSaveEdit = async (id) => {
    const updatedExpense = expenses.find(exp => exp.id === id);
    try {
      await updateDoc(doc(db, "expenses", id), updatedExpense);
      setEditingExpenseId(null);
    } catch (error) {
      console.error("Error updating expense: ", error);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
      setExpenses(expenses.filter(exp => exp.id !== id));
    } catch (error) {
      console.error("Error deleting expense: ", error);
    }
  };

  return (
    <div className="expenses-container container">
      <h1>Expenses Page</h1>
      <div className="expense-form card">
        <input type="date" name="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} />
        <select name="category" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}>
          <option value="">Select Category</option>
          {predefinedCategories.map((cat, index) => (
            <option key={index} value={cat}>{cat}</option>
          ))}
        </select>
        <input type="text" name="name" placeholder="Expense Name" value={newExpense.name} onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })} />
        <input type="text" name="description" placeholder="Description" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
        <input type="number" name="amount" placeholder="Amount" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
        <button onClick={handleAddExpense}>Add Expense</button>
      </div>
      <div className="filter-section">
        <select onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom Date Range</option>
        </select>
        {filter === "custom" && (
          <>
            <input type="date" onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} />
            <input type="date" onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} />
          </>
        )}
      </div>
      <h3>Total Expenses: ₹{calculateTotalExpenses()}</h3>
      <table className="styled-table card">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Date</th>
            <th>Category</th>
            <th>Name</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.map((expense, index) => (
            <tr key={expense.id}>
              <td>{index + 1}</td>
              <td>
                {editingExpenseId === expense.id ? (
                  <input type="date" value={expense.date instanceof Date && !isNaN(expense.date) ? expense.date.toISOString().split("T")[0] : "No Date"
                  } onChange={(e) => handleEditChange(e, expense.id, "date")} />
                ) : (
                  expense.date instanceof Date && !isNaN(expense.date) ? expense.date instanceof Date && !isNaN(expense.date) ? expense.date.toISOString().split("T")[0] : "No Date"
                  : "Invalid Date"
                )}
              </td>
              <td>
                {editingExpenseId === expense.id ? (
                  <select value={expense.category} onChange={(e) => handleEditChange(e, expense.id, "category")}>
                    {predefinedCategories.map((cat, index) => (
                      <option key={index} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  expense.category
                )}
              </td>
              <td>{editingExpenseId === expense.id ? <input type="text" value={expense.name} onChange={(e) => handleEditChange(e, expense.id, "name")} /> : expense.name}</td>
              <td>{editingExpenseId === expense.id ? <input type="text" value={expense.description} onChange={(e) => handleEditChange(e, expense.id, "description")} /> : expense.description}</td>
              <td>{editingExpenseId === expense.id ? <input type="number" value={expense.amount} onChange={(e) => handleEditChange(e, expense.id, "amount")} /> : `₹${expense.amount}`}</td>
              <td>
                {editingExpenseId === expense.id ? (
                  <button onClick={() => handleSaveEdit(expense.id)}>Save</button>
                ) : (
                  <button onClick={() => setEditingExpenseId(expense.id)}>Edit</button>
                )}
                <button onClick={() => handleDeleteExpense(expense.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExpensesPage;
