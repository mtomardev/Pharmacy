import React from "react";
import { Link } from "react-router-dom"; // React Router for navigation
import { signOut } from "firebase/auth"; // Firebase sign-out method
import { auth } from "../firebase"; // Import Firebase authentication

const NavBar = ({ user }) => {
  // Sign-out function
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error.message);
    }
  };

  return (
    <nav style={{ padding: "10px", background: "#333", color: "#fff" }}>
      {/* Home Link */}
      <Link to="/" style={{ marginRight: "10px", color: "#fff" }}>
        Home
      </Link>
      
      {/* Invoice Link (only visible if logged in) */}
      {user && (
        <Link to="/invoice" style={{ marginRight: "10px", color: "#fff" }}>
          Invoice
        </Link>
      )}

      {/* Inventory Link (only visible if logged in) */}
      {user && (
        <Link to="/inventory" style={{ marginRight: "10px", color: "#fff" }}>
          Inventory
        </Link>
      )}

       {/* SalesReport Link (only visible if logged in) */}
       {user && (
        <Link to="/salesreport" style={{ marginRight: "10px", color: "#fff" }}>
          Sales Report
        </Link>
      )}

      {/* ExpenseReport Link (only visible if logged in) */}
      {user && (
        <Link to="/expensereport" style={{ marginRight: "10px", color: "#fff" }}>
          Expense Report
        </Link>
      )}

      {/* Sign Out Button (only visible if logged in) */}
      {user ? (
        <button onClick={handleSignOut} style={{ color: "#fff" }}>
          Sign Out
        </button>
      ) : (
        <Link to="/login" style={{ color: "#fff" }}>
          Login
        </Link>
      )}
    </nav>
  );
};

export default NavBar;
