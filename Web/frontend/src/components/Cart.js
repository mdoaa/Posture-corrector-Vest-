import "../component style/Cart.css";
import NAV from "./Nav";
import Footer from "./Footer";
import { useUser } from "./UserContext";
import { useCart } from "./CartContext";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const { user } = useUser();
  const { products, subtotal, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (productId, newQty) => {
    if (newQty < 1) return;
    updateQuantity(productId, newQty);
  };

  const handleRemove = (productId) => {
    console.log("Removing product with ID:", productId);
    removeFromCart(productId);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NAV />

      <div className="cart-container">
        <div className="cart-left">
          <h1 className="cart-title">Review Your Cart</h1>
          {products.length === 0 ? (
            <h2 style={{ textAlign: "center", fontFamily: "serif", marginTop: "100px" }}>
              Your cart is empty 😢
            </h2>
          ) : (
            products.map((product) => (
              <div key={product._id} className="cart-item">
                <img src={`http://localhost:8080/uploads/${product.image}`}  alt={product.name} />
                <div className="cart-item-details">
                  <h3>{product.name}</h3>
                  <p style={{ color: "#555" }}>{product.description || "SitX vest"}</p>
                </div>
                <div className="cart-item-price">
                  <p>
                    <strong>${(product.price).toFixed(2)}</strong>
                  </p>
                  <label>
                    Qty:
                    <input
                      type="number"
                      min="1"
                      className="qty-input"
                      value={product.quantity}
                      onChange={(e) => handleQuantityChange(product._id, parseInt(e.target.value))}
                    />
                  </label>
                  <button className="remove-btn" onClick={() => handleRemove(product._id)}>
                    Remove
                  </button>
                  <p>Total: ${(product.price * product.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-subtotal">
          <h2>Subtotal</h2>
          <p className="subtotal-amount">${subtotal}</p>
          <button className="checkout-btn" onClick={() => navigate("/ConfirmOrder")}>
            CHECK OUT
          </button>
          <button className="continue-btn" onClick={() => navigate("/BuyNow")}>
            CONTINUE SHOPPING
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Cart;
