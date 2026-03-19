import React, { useMemo } from "react";
import axios from "axios";
import { useNavigate, Link, NavLink } from "react-router-dom";
import { BsBag } from "react-icons/bs";
import { useUser } from "./UserContext";

const NavBar = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const cartItemCount = useMemo(() => user?.cart?.length || 0, [user]);

  const handleLogout = async () => {
    try {
      await axios.post(
        "https://sitx-backend-new.onrender.com/logout",
        {},
        { withCredentials: true },
      );
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.log("logout failed", err);
    }
  };

  const linkBase =
    "text-sm font-medium text-slate-700 transition hover:text-slate-900";
  const linkActive = "text-slate-900";

  return (
    <header className="sticky top-0 z-50">
      {/* subtle top border + glass */}
      <div className="border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={process.env.PUBLIC_URL + "/SitX_logo.png"}
              alt="SitX"
              className="h-9 w-9 rounded-xl border border-black/10 bg-white object-contain"
            />
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              SitX
            </span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              HOME
            </NavLink>

            <NavLink
              to="/howItWorks"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              HOW IT WORKS
            </NavLink>

            <NavLink
              to="/buyNow"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ""}`
              }
            >
              BUY NOW
            </NavLink>

            {user ? (
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              >
                LOGOUT
              </button>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ""}`
                }
              >
                LOGIN
              </NavLink>
            )}

            {/* Cart */}
            <Link
              to="/Cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 shadow-sm transition hover:bg-white"
              aria-label="Cart"
            >
              <BsBag size={18} className="text-slate-800" />

              {cartItemCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-xs font-semibold text-white shadow">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
