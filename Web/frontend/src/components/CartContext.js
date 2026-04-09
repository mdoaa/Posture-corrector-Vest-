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

const LOCAL_CART_KEY = "sitx-local-cart";

const readLocalCart = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

const writeLocalCart = (items) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
};

export const CartProvider = ({ children }) => {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [subtotal, setSubtotal] = useState("0.00");

  // ✅ API inside component + memoized (so it can be a valid dependency)
  const API = useMemo(
    () => process.env.REACT_APP_API_URL || "https://sitx-backend-new.onrender.com",
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
      const localCart = readLocalCart();

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

      if (productData.length > 0) {
        setProducts(productData);
        updateSubtotal(productData);
        return;
      }

      if (localCart.length > 0) {
        setProducts(localCart);
        updateSubtotal(localCart);
        return;
      }

      setProducts([]);
      updateSubtotal([]);
    } catch (err) {
      console.error("Failed to fetch cart products:", err);
      const localCart = readLocalCart();

      if (localCart.length > 0) {
        setProducts(localCart);
        updateSubtotal(localCart);
        return;
      }

      setProducts([]);
      updateSubtotal([]);
    }
  }, [API, user, updateSubtotal]);

  useEffect(() => {
    fetchCartProducts();
  }, [fetchCartProducts]);

  const addToCart = useCallback(
    async (productOrId) => {
      try {
        const productId =
          typeof productOrId === "object" ? productOrId._id : productOrId;

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

        if (typeof productOrId === "object" && productOrId) {
          const localCart = readLocalCart();
          const productId = productOrId._id || `local-${Date.now()}`;
          const existingItem = localCart.find((item) => item._id === productId);
          const nextCart = existingItem
            ? localCart.map((item) =>
                item._id === productId
                  ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
                  : item
              )
            : [
                ...localCart,
                {
                  _id: productId,
                  name: productOrId.name || "SitX Posture Corrector Vest",
                  description:
                    productOrId.description ||
                    "Premium posture support vest for everyday desk work.",
                  price: Number(productOrId.price) || 50,
                  image: productOrId.image || "vestfront.jpg",
                  quantity: 1,
                  _local: true,
                },
              ];

          writeLocalCart(nextCart);
          setProducts(nextCart);
          updateSubtotal(nextCart);
        }
      }
    },
    [API, user, fetchCartProducts, updateSubtotal]
  );

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      try {
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty < 1) return;

        const localCart = readLocalCart();
        const localItem = localCart.find((item) => item._id === productId);

        if (localItem) {
          const next = localCart.map((item) =>
            item._id === productId ? { ...item, quantity: qty } : item
          );

          writeLocalCart(next);
          setProducts(next);
          updateSubtotal(next);
          return;
        }

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
        const localCart = readLocalCart();
        const localItem = localCart.find((item) => item._id === productId);

        if (localItem) {
          const next = localCart.filter((item) => item._id !== productId);
          writeLocalCart(next);
          setProducts(next);
          updateSubtotal(next);
          return;
        }

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
