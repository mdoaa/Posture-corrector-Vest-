import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../component style/LoginAndRegister.css";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👈 icons
import { GoogleLogin } from "@react-oauth/google"; // 👈 Google login component

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:8080/login",
        {
          email,
          password,
        },
        {
          withCredentials: true, // This tells axios to send and receive cookies
        }
      );
      console.log("response  "+JSON.stringify(response.data.user));
      if (response.data.message) {
        //localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/")
      } ; // Redirect home on successful login
    } catch (error) {
      alert("Invalid Credentials");
    }
  };

  const handleGoogleLogin = async () => {
    const response = (window.location.href =
      "http://localhost:8080/auth/google");
    console.log(" from frontEnd " + response);
  };

  
  const handleGoogleLoginFailure = (error) => {
    console.error("Google login error", error);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-container">
          <img src="SitX_logo.png" alt="SitX Logo" className="logo" />
          <h1 className="logo-text">SitX</h1>
        </div>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
        <div className="password-wrapper ">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              cursor: "pointer",
              position: "absolute",
              right: "6px",
              top: "52%",
              transform: "translateY(-50%)",
            }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button className="login-btn" onClick={handleLogin}>
          Log In
        </button>

        <GoogleLogin
          clientId="817788151027-tlt5huenvf3a249l33l6r29cj5sfmpn9.apps.googleusercontent.com"
          onSuccess={handleGoogleLogin} 
          onError={handleGoogleLoginFailure}
          render={(renderProps) => (
            <button
              onClick={renderProps.onClick}
              disabled={renderProps.disabled}
              className="google-login-btn"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Google_2015_logo.svg"
                alt="Google Logo"
                className="google-logo"
              />
            
            </button>
          )}
        />

        <div className="links">
          <p>
            Don't have an account?{" "}
            <span className="link" onClick={() => navigate("/register")}>
              Signup
            </span>
          </p>
          <p className="link" onClick={() => navigate("/forgetPassword")}>Forgot password?</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
