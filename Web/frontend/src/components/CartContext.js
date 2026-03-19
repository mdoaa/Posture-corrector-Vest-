import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import { useUser } from "./UserContext";
import { getOrCreateGuestId } from "./UtilityGuest";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [subtotal, setSubtotal] = useState("0.00");

  // ✅ API inside component + memoized (so it can be a valid dependency)
  const API = useMemo(
    () => process.env.REACT_APP_API_URL || "https://sitx.onrender.com",
    []
  );

  const updateSubtotal = useCallback((items) => {
    const total = (items || []).reduce(
      (acc, p) => acc + (Number(p.price) || 0) * (Number(p.quantity) || 0),
      0
    );
    setSubtotal(total.toFixed(2));
  }, []);

  const fetchCartProducts = useCallback(async () => {
    try {
      let cartResponse;

      if (!user) {
        const guestId = getOrCreateGuestId();
        cartResponse = await axios.get(`${API}/cart?guestId=${guestId}`, {
          withCredentials: true,
        });
      } else {
        cartResponse = await axios.get(`${API}/cart?userId=${user._id}`, {
          withCredentials: true,
        });
      }

      const cart = cartResponse.data.cart || [];

      const productData = await Promise.all(
        cart.map((item) =>
          axios
            .get(`${API}/product/${item.productId}`, { withCredentials: true })
            .then((res) => ({
              ...res.data,
              quantity: item.quantity,
            }))
        )
      );

      setProducts(productData);
      updateSubtotal(productData);
    } catch (err) {
      console.error("Failed to fetch cart products:", err);
      setProducts([]);
      updateSubtotal([]);
    }
  }, [API, user, updateSubtotal]);

  useEffect(() => {
    fetchCartProducts();
  }, [fetchCartProducts]);

  const addToCart = useCallback(
    async (productId) => {
      try {
        if (!user) {
          const guestId = getOrCreateGuestId();
          await axios.post(
            `${API}/add`,
            { guestId, productId },
            { withCredentials: true }
          );
        } else {
          await axios.post(
            `${API}/add`,
            { userId: user._id, guestId: user?.guestId, productId },
            { withCredentials: true }
          );
        }

        await fetchCartProducts();
      } catch (error) {
        console.error("Failed to add item to cart:", error);
      }
    },
    [API, user, fetchCartProducts]
  );

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      try {
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty < 1) return;

        const item = await axios.get(`${API}/product/${productId}`, {
          withCredentials: true,
        });

        if ((item.data.stock ?? 0) < qty) {
          alert("Not enough stock available");
          return;
        }

        if (user) {
          await axios.post(
            `${API}/updateQuantity`,
            { userId: user._id, productId, quantity: qty },
            { withCredentials: true }
          );
        } else {
          const guestId = getOrCreateGuestId();
          await axios.post(
            `${API}/updateQuantity`,
            { guestId, productId, quantity: qty },
            { withCredentials: true }
          );
        }

        setProducts((prev) => {
          const next = prev.map((p) =>
            p._id === productId ? { ...p, quantity: qty } : p
          );
          updateSubtotal(next);
          return next;
        });
      } catch (error) {
        console.error("Failed to update quantity:", error);
      }
    },
    [API, user, updateSubtotal]
  );

  const removeFromCart = useCallback(
    async (productId) => {
      try {
        const guestId = user ? null : getOrCreateGuestId();

        await axios.delete(`${API}/product/${productId}`, {
          data: { userId: user?._id || null, guestId },
          withCredentials: true,
        });

        setProducts((prev) => {
          const next = prev.filter((p) => p._id !== productId);
          updateSubtotal(next);
          return next;
        });
      } catch (error) {
        console.error("Failed to remove item from cart:", error);
      }
    },
    [API, user, updateSubtotal]
  );

  return (
    <CartContext.Provider
      value={{
        products,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        setProducts,
        fetchCartProducts,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};