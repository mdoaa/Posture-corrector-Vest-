import NavBar from "./Nav";
import Footer from "./Footer";
import React, { useState, useEffect } from "react";
import axios from "axios";
import "../component style/Buy.css";
import { useUser } from "./UserContext";
import { getOrCreateGuestId } from "./UtilityGuest";
import { useCart } from "./CartContext";

const images = [
  { src: "vestfront.jpg", alt: "image" },
  { src: "vestback.jpg", alt: "image" },
];

const Buy = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user, setUser } = useUser();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("black");
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    axios
      .get("http://localhost:8080/products")
      .then((res) => {
        setProducts(res.data);
        if (res.data.length > 0) {
          setSelectedProduct(res.data[0]); // Select first product by default
        }
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  const prevImage = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const nextImage = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleBuy = () => {
    if (selectedProduct) {
      addToCart(selectedProduct._id);
    }
  };

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  if (!selectedProduct) {
    return (
      <div>
        <NavBar />
        <div style={{ marginTop: "200px", textAlign: "center" }}>
          <p>Loading products...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <NavBar />

      <div className="product-detail-container">
        {/* Left side - Product Images */}
        <div className="product-images">
          <div className="main-image">
            <img
              src={images[currentIndex].src}
              alt={images[currentIndex].alt}
              className="main-product-image"
            />
          </div>

          <div className="thumbnail-images">
            {images.map((image, index) => (
              <div
                key={index}
                className={`thumbnail ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                <img src={image.src} alt={image.alt} />
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Product Details */}
        <div className="product-info">
          <h1 className="product-title">{selectedProduct.name}</h1>

          <div className="rating">
            <div className="stars">
              <span>★★★★★</span>
              <span className="rating-text">4.9 (2,847 reviews)</span>
            </div>
          </div>

          <div className="price-section">
            <span className="current-price">${selectedProduct.price}</span>
          </div>

          <div className="color-section">
            <h3>Color</h3>
            <div className="color-options">
              {[
                { name: "black", color: "#000000" },
                { name: "gray", color: "#808080" },
                { name: "blue", color: "#007bff" },
              ].map((colorOption) => (
                <button
                  key={colorOption.name}
                  className={`color-btn ${
                    selectedColor === colorOption.name ? "selected" : ""
                  }`}
                  style={{ backgroundColor: colorOption.color }}
                  onClick={() => setSelectedColor(colorOption.name)}
                />
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button className="add-to-cart-btn" onClick={handleBuy}>
              🛒 Add to Cart
            </button>
          </div>

          <div className="key-features">
            <h3>Key Features</h3>
            <ul>
              <li>
                Easy to wear — Velcro and elastic straps for quick adjustment
              </li>
              <li>Durable materials for long-lasting use</li>
              <li>Built for men and women of all ages</li>
              <li>
                Made with breathable, moisture-wicking fabric to keep you cool
              </li>
              <li>Helps reduce neck, back, and shoulder pain</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Buy;
