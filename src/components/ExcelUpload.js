import React, { useState } from "react";
import * as XLSX from "xlsx";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase"; // Firestore instance
import './ExcelUpload.css'; // Import the CSS for the spinner

const ExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Make sure this function exists
  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileProcessing = async () => {
    if (!file) {
      alert("Please upload an Excel file.");
      return;
    }

    setLoading(true); // Show loading spinner

    const reader = new FileReader();
    reader.readAsBinaryString(file);

    reader.onload = async (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON with correct column mapping
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      console.log("Extracted JSON Data:", jsonData);

      if (jsonData.length === 0) {
        alert("The Excel file is empty or incorrectly formatted.");
        setLoading(false);
        return;
      }

      const sampleRow = jsonData[0];
      console.log("Sample Row Structure:", sampleRow);

      // Define expected columns
      const requiredColumns = [
        "HSN Code", "Batch No", "Name", "Salt", "Expiry Date", "Scheme",
        "MRP", "Cost Price", "Discount (%)", "Selling Price",
        "Distributor", "H1 Drug"
      ];

      const fileColumns = Object.keys(sampleRow);
      console.log("Detected Columns:", fileColumns);

      const isValidFormat = requiredColumns.every(col => fileColumns.includes(col));
      if (!isValidFormat) {
        alert("Incorrect Excel format! Please upload a file with the correct column names.");
        setLoading(false);
        return;
      }

      try {
        for (const product of jsonData) {
          console.log("Uploading product:", product);

          await addDoc(collection(db, "medicines"), {
            hsnCode: product["HSN Code"] || "",
            batchNo: product["Batch No"] || "",
            name: product["Name"] || "",
            salt: product["Salt"] || "",
            expiryDate: product["Expiry Date"] || "",
            scheme: product["Scheme"] || "",
            mrp: parseFloat(product["MRP"]) || 0,
            costPrice: parseFloat(product["Cost Price"]) || 0,
            discount: parseFloat(product["Discount (%)"]) || 0,
            sellingPrice: parseFloat(product["Selling Price"]) || 0,
            distributor: product["Distributor"] || "",
            h1Drug: product["H1 Drug"] || ""
          });
        }
        alert("Inventory updated successfully!");
      } catch (error) {
        console.error("Error uploading data:", error);
        alert("Error uploading data.");
      } finally {
        setLoading(false);
      }
    };
  };

  return (
    <div>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      <button onClick={handleFileProcessing} disabled={loading}>
        {loading ? "Uploading..." : "Upload to Inventory"}
      </button>

      {loading && <div className="loading-indicator"></div>}
    </div>
  );
};

export default ExcelUpload;
