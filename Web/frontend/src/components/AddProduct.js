import React, { useState } from "react";
import axios from "axios";
import NAV from "./Nav";
import "../component style/AddProduct.css";

const AddProduct = () => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    image: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData({ ...formData, image: files[0] }); // store selected file
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('name', formData.name);
    data.append('price', formData.price);
    data.append('stock', formData.stock);
    data.append('description', formData.description);
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      const res = await axios.post("http://localhost:8080/admin/products", data, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true, 
      });
      alert("Product added successfully");
      console.log("Added product:", res.data);
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Failed to add product");
    }
  };

  return (
    <div>
      <NAV />
      <div className="add-product-container">
        <h2>Add Product</h2>
        <p>Create a new product for your inventory</p>
        <form
          className="product-form"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          <div className="form-row">
            <div className="form-group">
              <label>Product Name*</label>
              <input
                type="text"
                name="name"
                required
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Price ($)*</label>
              <input
                type="number"
                name="price"
                required
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Stock*</label>
              <input
                type="number"
                name="stock"
                required
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Image*</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                required
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Description*</label>
            <textarea
              name="description"
              required
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Add Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
