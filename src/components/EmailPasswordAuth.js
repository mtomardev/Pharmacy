import React, { useState } from "react";
import { auth } from "../firebase"; // Import auth from firebase.js
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import "./General.css";

const EmailPasswordAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isNewUser, setIsNewUser] = useState(false); // Toggle between sign-up and login
  const [user, setUser] = useState(null); // To hold logged-in user information

  // Sign Up Function
  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setMessage(`User registered successfully: ${userCredential.user.email}`);
      setUser(userCredential.user); // Set the logged-in user
    } catch (error) {
      setMessage(`Error during sign up: ${error.message}`);
    }
  };

  // Log In Function
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setMessage(`Welcome back, ${userCredential.user.email}`);
      setUser(userCredential.user); // Set the logged-in user
    } catch (error) {
      setMessage(`Error during login: ${error.message}`);
    }
  };

  // Sign Out Function
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMessage("You have signed out.");
      setUser(null); // Clear the user state after sign-out
    } catch (error) {
      setMessage("Error during sign out: " + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Email/Password Authentication</h1>
      <div className="card">
      {message && <p>{message}</p>}

      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {isNewUser ? (
            <button onClick={handleSignUp}>Sign Up</button>
          ) : (
            <button onClick={handleLogin}>Log In</button>
          )}

          <p>
            {isNewUser ? "Already have an account?" : "Don't have an account?"}{" "}
            <span
              onClick={() => setIsNewUser(!isNewUser)}
              style={{ color: "blue", cursor: "pointer" }}
            >
              {isNewUser ? "Log In" : "Sign Up"}
            </span>
          </p>
          
        </div>
      )}
      </div>
    </div>
  );
};

export default EmailPasswordAuth;
