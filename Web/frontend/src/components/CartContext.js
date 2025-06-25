import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from './UserContext';
import { getOrCreateGuestId } from './UtilityGuest'; 

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    fetchCartProducts();
  }, [user]); 
  
  const fetchCartProducts = async () => {
    try {
      let cartResponse;
  
      if (!user) {
        const guestId = getOrCreateGuestId();
        cartResponse = await axios.get(`http://localhost:8080/cart?guestId=${guestId}`);
      } else {
        cartResponse = await axios.get(`http://localhost:8080/cart?userId=${user._id}`);
      }
  
      const cart = cartResponse.data.cart || [];
  
      const productData = await Promise.all(
        cart.map(item =>
          axios.get(`http://localhost:8080/product/${item.productId}`).then(res => ({
            ...res.data,
            quantity: item.quantity,
          }))
        )
      );
  
      setProducts(productData);
      updateSubtotal(productData);
  
    } catch (err) {
      console.error("Failed to fetch cart products:", err);
    }
  };

  const updateSubtotal = (products) => {
    const total = products.reduce((acc, product) => acc + product.price * product.quantity, 0);
    setSubtotal(total.toFixed(2));
  };

  const addToCart = async (productId) => {
    try {
      if (!user) {
        const guestId = getOrCreateGuestId();
        const response =await axios.post('http://localhost:8080/add', {
          guestId,
          productId,
        });
        const updatedCart = response.data.cart;
        setProducts(updatedCart);
        updateSubtotal(updatedCart);
        return;
      }
      const response = await axios.post('http://localhost:8080/add', {
        userId: user?._id,
        guestId: user?.guestId, 
        productId,
      });
      const updatedCart = response.data.cart;
      setProducts(updatedCart);
      updateSubtotal(updatedCart);
    } catch (error) {
      console.error("Failed to add item to cart:", error);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const item = await axios.get(`http://localhost:8080/product/${productId}`);
      if (item.data.stock < quantity) {
        alert("Not enough stock available");
        return;
      }
      if (user) {
        await axios.post('http://localhost:8080/updateQuantity', {
          userId: user._id,
          productId,
          quantity,
        });
      } else {
        const guestId = getOrCreateGuestId();
        await axios.post('http://localhost:8080/updateQuantity', {
          guestId,
          productId,
          quantity,
        });
      }
  
      setProducts(prev =>
        prev.map(product =>
          product._id === productId ? { ...product, quantity } : product
        )
      );
      updateSubtotal(products);
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };  

  const removeFromCart = async (productId) => {
    let guestId=null;
    if (!user) {
      guestId = getOrCreateGuestId();
    }
    
  
    try {
      await axios.delete(`http://localhost:8080/product/${productId}`, {
        data: {
          userId: user?._id || null,
          guestId: user ? null : guestId, // Send guestId only if not logged in
        },
        withCredentials: true,
      });
  
      setProducts((prev) => prev.filter((product) => product._id !== productId));
      updateSubtotal(products);
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
    }
  };

  return (
    <CartContext.Provider value={{ products, subtotal, addToCart, updateQuantity, removeFromCart, setProducts }}>
      {children}
    </CartContext.Provider>
  );
};
