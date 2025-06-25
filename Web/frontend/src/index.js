import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./components/UserContext";
import { CartProvider } from "./components/CartContext";
import "./styles.css";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import Buy from "./components/Buy";
import Cart from "./components/Cart";
import HowItWorks from "./components/HowItWorks";
import ConfirmOrder from "./components/ConfirmOrder";
import ForgetPassword from "./components/ForgetPassword";
import Admin from "./components/Admin";
import AddProduct from "./components/AddProduct";
import AdminRoute from "./components/ProtectAdmin";
import UserRoute from "./components/ProtectUser";
import GoogleSuccess from "./components/google-success";
import ViewProducts from "./components/ViewProducts"
import { EmailProvider } from "./components/EmailContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const App = () => {
  return (
    <EmailProvider>
      <UserProvider>
      <CartProvider>
          <BrowserRouter>
            <GoogleOAuthProvider clientId="817788151027-tlt5huenvf3a249l33l6r29cj5sfmpn9.apps.googleusercontent.com">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Home />} />
                <Route path="/buyNow" element={<Buy />} />
                <Route path="/howItWorks" element={<HowItWorks />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/google-success" element={<GoogleSuccess />} />
                <Route path="/allProducts" element={<ViewProducts />} />
                <Route path="/confirmOrder" element={
                  <UserRoute>
                    <ConfirmOrder />
                  </UserRoute>
                  } />
                <Route path="/forgetPassword" element={<ForgetPassword />} />
                <Route
                  path="/admin"element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
                <Route path="/addProduct" element={
                  <AdminRoute>
                    <AddProduct />
                  </AdminRoute>
                } />
              </Routes>
            </GoogleOAuthProvider>
          </BrowserRouter>
          </CartProvider>
        </UserProvider>
    </EmailProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
