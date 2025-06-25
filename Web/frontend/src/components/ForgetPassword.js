import NavBar from "./Nav";
import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../component style/ForgetPassword.css";
import { EmailContext } from "./EmailContext";

const ForgetPassword = () => {
  const navigate = useNavigate();

  const { email, setEmail } = useContext(EmailContext);
  const [newPassword, setnewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOTP] = useState("");
  const [otpVerified, setOTPVerified] = useState(false);

  const handleOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:8080/send-otp", {
        email,
      });
      alert(response.data.message);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:8080/verify-otp", {
        email,
        otp,
      });
      alert(response.data.message);
      if (response.data.message) {
        setOTPVerified(true);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    try {
      const response = await axios.post(
        "http://localhost:8080/updatePassword",
        {
          email,
          newPassword,
        }
      );
      alert(response.data.sucess);
      if (response.data.message) {
        navigate("/login");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="forget-password-container">
      <div className="forget-box">
        <div className="logo-container">
          <img src="SitX_logo.png" alt="SitX Logo" className="logo" />
          <h1 className="logo-text">SitX</h1>
        </div>
        <form className="form-fields" onSubmit={handleUpdatePassword}>
          {!otpVerified ? (
            <>
              <div className="email-otp-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
                <button className="otp-btn" onClick={handleOTP} type="button">
                  Send OTP to verify Email
                </button>
              </div>

              <div classname="email-otp-row">
                <input
                  type="text"
                  placeholder="Enter your OTP"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value)}
                  className="input-field"
                />
                <button
                  className="otp-btn"
                  onClick={handleVerifyOTP}
                  type="button"
                >
                  Verify OTP
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={newPassword}
                  onChange={(e) => setnewPassword(e.target.value)}
                  className="input-field"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <button className="login-btn" type="submit">
                Sign Up
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ForgetPassword;
