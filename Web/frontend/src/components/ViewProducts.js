import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../component style/ViewProduct.css";

const ViewProducts = () => {
  const [products, setProducts] = useState([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get("http://localhost:8080/admin/product", {
          withCredentials: true,
        });
        setProducts(response.data.products);
        setCount(response.data.count);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to fetch products");
      }
    };
    fetchProducts();
  }, []);

  const handleEditClick = (product) => {
    setEditingProductId(product._id);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
    });
    setImagePreview(`http://localhost:8080/uploads/${product.image}`);
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files[0];
      setEditForm((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append("name", editForm.name);
      formData.append("description", editForm.description);
      formData.append("price", editForm.price);
      formData.append("stock", editForm.stock);
      if (editForm.image) {
        formData.append("image", editForm.image);
      }

      const response = await axios.put(
        `http://localhost:8080/admin/products/${editingProductId}`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update product list
      setProducts((prev) =>
        prev.map((prod) =>
          prod._id === editingProductId ? response.data : prod
        )
      );

      setEditingProductId(null);
      setEditForm({});
      setImagePreview(null);
    } catch (err) {
      console.error("Error updating product:", err);
      setError("Failed to update product");
    }
  };

  return (
    <div className="view-products-container">
      <h1>All Products ({count})</h1>
      <button className="admin-button" onClick={() => navigate("/admin")}>
        Go to Admin Dashboard
      </button>
      {error && <p className="error">{error}</p>}

      <div className="products-grid">
        {products.map((product) => (
          <div className="product-card" key={product._id}>
            {editingProductId === product._id ? (
              <div className="edit-form">
                <input
                  type="text"
                  name="name"
                  value={editForm.name || ""}
                  onChange={handleFormChange}
                  placeholder="Product Name"
                />
                <input
                  type="text"
                  name="description"
                  value={editForm.description || ""}
                  onChange={handleFormChange}
                  placeholder="Description"
                />
                <input
                  type="number"
                  name="price"
                  value={editForm.price || ""}
                  onChange={handleFormChange}
                  placeholder="Price"
                />
                <input
                  type="number"
                  name="stock"
                  value={editForm.stock || ""}
                  onChange={handleFormChange}
                  placeholder="Stock"
                />
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleFormChange}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="product-image"
                  />
                )}
                <button onClick={handleSave} className="admin-button">
                  Save
                </button>
              </div>
            ) : (
              <>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <p>
                  <strong>Price:</strong> ${product.price}
                </p>
                <p>
                  <strong>Stock:</strong> {product.stock}
                </p>
                {product.image && (
                  <img
                    src={`http://localhost:8080/uploads/${product.image}`}
                    alt={product.name}
                    className="product-image"
                  />
                )}
                <button
                  className="admin-button"
                  onClick={() => handleEditClick(product)}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewProducts;
