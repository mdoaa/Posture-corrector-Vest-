import React, { useState, useContext } from "react";
import NavBar from "./Nav";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { EmailContext } from "./EmailContext";

const ForgetPassword = () => {
  const navigate = useNavigate();

  const { email, setEmail } = useContext(EmailContext);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOTP] = useState("");
  const [otpVerified, setOTPVerified] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [updating, setUpdating] = useState(false);

  const img = (path) => process.env.PUBLIC_URL + path;

  const handleOTP = async () => {
    if (!email) return alert("Please enter your email first.");
    if (sendingOtp) return;

    try {
      setSendingOtp(true);
      const response = await axios.post("https://sitx-backend-new.onrender.com/send-otp", {
        email,
      });
      alert(response.data?.message || "OTP sent!");
    } catch (error) {
      alert(error.response?.data?.error || error.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!email) return alert("Please enter your email first.");
    if (!otp) return alert("Please enter the OTP.");
    if (verifyingOtp) return;

    try {
      setVerifyingOtp(true);
      const response = await axios.post(
        "https://sitx-backend-new.onrender.com/verify-otp",
        {
          email,
          otp,
        },
      );

      alert(response.data?.message || "OTP verified!");
      if (response.data?.message) setOTPVerified(true);
    } catch (error) {
      alert(error.response?.data?.error || error.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!otpVerified) return;
    if (!newPassword) return alert("Please enter a new password.");
    if (updating) return;

    try {
      setUpdating(true);
      const response = await axios.put(
        "https://sitx-backend-new.onrender.com/forget-password",
        {
          email,
          password: newPassword,
        },
      );

      alert(response.data?.sucess || response.data?.message || "Updated!");
      if (response.data?.message) navigate("/login");
    } catch (error) {
      alert(error.response?.data?.error || error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_55%)]" />
      </div>

      <NavBar />

      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center justify-center px-4 py-14">
        <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/80 p-6 shadow-xl shadow-black/10 backdrop-blur md:p-10">
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <img
                src={img("/SitX_logo.png")}
                alt="SitX Logo"
                className="h-12 w-12 rounded-2xl border border-black/10 bg-white object-contain"
              />
              <h1 className="text-2xl font-semibold tracking-tight">SitX</h1>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Reset your password securely using OTP verification.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {!otpVerified ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOTP}
                  disabled={sendingOtp}
                  className="w-full rounded-xl border border-black/10 bg-white px-6 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingOtp ? "Sending OTP..." : "Send OTP to verify Email"}
                </button>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    OTP Code
                  </label>
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOTP(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={verifyingOtp}
                  className="w-full rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    New Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-11 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="mt-2 w-full rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updating ? "Updating..." : "Update Password"}
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Remembered your password?{" "}
            <button
              className="font-medium text-slate-900 underline underline-offset-4"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
