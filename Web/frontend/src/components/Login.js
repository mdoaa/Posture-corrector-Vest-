import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const img = (path) => process.env.PUBLIC_URL + path;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const response = await axios.post(
        "https://sitx.onrender.com/login",
        { email, password },
        { withCredentials: true }
      );

      if (response.data?.message) {
        navigate("/");
      } else {
        alert("Invalid Credentials");
      }
    } catch (error) {
      alert("Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  // You are using backend redirect OAuth, so success just triggers redirect
  const handleGoogleLogin = () => {
  window.location.href = "https://sitx.onrender.com/auth/google";
};

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      {/* soft background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_55%)]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-14">
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
              Welcome back. Log in to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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

            <div>
              <label className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-11 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/10" />
            <div className="text-xs text-slate-500">OR</div>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          {/* Google */}
          <div className="rounded-2xl border border-black/10 bg-white p-3">
            <button
  type="button"
  onClick={handleGoogleLogin}
  className="w-full rounded-xl border border-black/10 bg-white px-6 py-3 font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
>
  Continue with Google
</button>
          </div>

          {/* Links */}
          <div className="mt-6 space-y-2 text-center text-sm text-slate-600">
            <p>
              Don&apos;t have an account?{" "}
              <button
                className="font-medium text-slate-900 underline underline-offset-4"
                onClick={() => navigate("/register")}
              >
                Signup
              </button>
            </p>
            <button
              className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              onClick={() => navigate("/forgetPassword")}
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
