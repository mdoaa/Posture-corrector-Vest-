import Nav from "./Nav";
import Footer from "./Footer";
import "../component style/ConfirmOrder.css";
import { useUser } from "./UserContext";
import { useCart } from "./CartContext";
import { getOrCreateGuestId } from "./UtilityGuest";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ConfirmOrder = () => {
  const user = useUser().user;
  const { products, setProducts, subtotal } = useCart();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  console.log("user", user);
  const guestId = getOrCreateGuestId();

  const handlecConfirmOrder = async () => {

    if (!address || !city || !phone) {
      alert("Please fill all the delivery fields.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8080/confirm",
        {
          userId: user ? user._id : guestId,
          items: products.map((p) => ({
            productId: p._id,
            quantity: p.quantity,
          })),
          total: subtotal,
          name: user ? user.username : name,
          address,
          city,
          phone,
          email: user ? user.email : email,
        }
      );
      console.log("Order response:", response.data);

      alert("Order placed successfully!");
      setProducts([]); 
      navigate("/"); 
    } catch (error) {
      console.error("Order error:", error);
      alert(
        error.response?.data?.error ||
          "An error occurred while placing the order."
      );
    }
  };

  return (
    <div>
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <Nav />
        <div className="checkout-container">
          <div className="checkout-form">
            <h2>Delivery</h2>
            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <div className="address-row">
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {!user && (
  <>
    <input
      type="text"
      placeholder="Your Name"
      value={name}
      onChange={(e) => setName(e.target.value)}
    />
    <input
      type="email"
      placeholder="Your Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  </>
)}

            <div className="checkout-actions">
              <button className="confirm-btn" onClick={handlecConfirmOrder}>
                Confirm Order
              </button>
            </div>
          </div>

          <div className="checkout-summary">
            <h3 style={{ textAlign: "center" }}>Your Cart</h3>
            {products.length === 0 && <p>Your cart is empty</p>}
            {products.map((product) => (
              <div key={product._id}>
                <div className="cart-item">
                  <img src={`http://localhost:8080/uploads/${product.image}`} alt="Product Image" />
                  <div>
                    <p>{product.description}</p>
                    <span>${product.price}</span>
                  </div>
                </div>
                <div className="price-summary">
                  <p>Quantity: {product.quantity}</p>
                  <h3>Total: ${subtotal}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ConfirmOrder;
