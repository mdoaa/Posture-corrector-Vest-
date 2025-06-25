import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BsBag } from "react-icons/bs";
import { useUser } from './UserContext';
import {fetchCartProducts} from './CartContext'; 

const NavBar = () => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useUser();


  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:8080/logout", {}, { withCredentials: true });
      setUser(null);
      //localStorage.removeItem("user");
      navigate("/login");
      console.log("logout success"+ user);
    } catch (err) {
      console.log("logout failed " + err);
    }
  };

  const cartItemCount = user?.cart?.length || 0;

  //console.log("cartItemCount: " + user?.cart?.length||0);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="/home" className="nav-logo">
          <img src="SitX_logo.png" alt="SitX_logo" className="logo-img" /> SitX
        </a>
        <ul className="navbar-links">
          <li>
            <a href="/" className="nav-link">
              Home
            </a>
          </li>
          <li>
            <a href="/howItWorks" className="nav-link">
              How It Works
            </a>
          </li>
          <li>
            <a href="/buyNow" className="nav-link">
              Buy now
            </a>
          </li>
          <li>
            {user ? (
              <a onClick={handleLogout} className="nav-link">
                logout
              </a>
            ) : (
              <a href="/login" className="nav-link">
                login
              </a>
            )}
          </li>
          <li>
            <a
              href="/Cart"
              className="nav-link"
              style={{ position: "relative" }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <BsBag size={20} />
              {cartItemCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-10px",
                    background: isHovered ? '#5F6E73' : '#80969B',
                    color: "white",
                    borderRadius: "50%",
                    padding: "2px 6px",
                    fontSize: "12px",
                  }}
                >
                  {cartItemCount}
                </span>
              )}
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default NavBar;
