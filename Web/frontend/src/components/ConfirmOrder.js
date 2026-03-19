import React, { useMemo, useState } from "react";
import Nav from "./Nav";
import Footer from "./Footer";
import { useUser } from "./UserContext";
import { useCart } from "./CartContext";
import { getOrCreateGuestId } from "./UtilityGuest";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ConfirmOrder = () => {
  const user = useUser().user;
  const { products, setProducts, subtotal } = useCart();

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const navigate = useNavigate();
  const guestId = getOrCreateGuestId();

  const itemsCount = useMemo(
    () => products.reduce((a, p) => a + (Number(p.quantity) || 1), 0),
    [products]
  );

  const money = (n) => (Number(n) || 0).toFixed(2);

  const handleConfirmOrder = async () => {
    if (!address || !city || !phone) {
      alert("Please fill all the delivery fields.");
      return;
    }

    if (!user) {
      if (!name || !email) {
        alert("Please enter your name and email.");
        return;
      }
    }

    try {
      const response = await axios.post("https://sitx-backend-new.onrender.com/confirm", {
        userId: user ? user._id : guestId,
        items: products.map((p) => ({
          productId: p._id,
          quantity: p.quantity,
        })),
        total: subtotal,
        name: user ? user.username : name,
        address,
        city,
        phone,
        email: user ? user.email : email,
      });

      console.log("Order response:", response.data);

      alert("Order placed successfully!");
      setProducts([]);
      navigate("/");
    } catch (error) {
      console.error("Order error:", error);
      alert(
        error.response?.data?.error ||
          "An error occurred while placing the order."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      {/* soft background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_55%)]" />
      </div>

      <Nav />

      <main className="mx-auto max-w-7xl px-4 py-14 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Confirm Order
          </h1>
          <p className="mt-2 text-slate-600">
            Enter delivery details and review your cart before placing the
            order.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* LEFT: FORM */}
          <section className="lg:col-span-2 rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
            <h2 className="text-xl font-semibold">Delivery</h2>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Street, building, apartment..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  City
                </label>
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="+20..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {!user && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Your Email
                    </label>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleConfirmOrder}
                disabled={products.length === 0}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-4 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Order →
              </button>

              {products.length === 0 && (
                <p className="text-sm text-slate-600">
                  Your cart is empty.{" "}
                  <button
                    className="font-medium text-slate-900 underline underline-offset-4"
                    onClick={() => navigate("/buyNow")}
                  >
                    Continue shopping
                  </button>
                  .
                </p>
              )}
            </div>
          </section>

          {/* RIGHT: SUMMARY */}
          <aside className="h-fit rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur lg:sticky lg:top-24 md:p-7">
            <h3 className="text-lg font-semibold text-slate-900">Your Cart</h3>
            <p className="mt-1 text-sm text-slate-600">
              {itemsCount} item{itemsCount === 1 ? "" : "s"}
            </p>

            <div className="mt-5 space-y-4">
              {products.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-slate-600">
                  Your cart is empty.
                </div>
              ) : (
                products.map((product) => (
                  <div
                    key={product._id}
                    className="flex gap-4 rounded-2xl border border-black/10 bg-white p-4"
                  >
                    <div className="overflow-hidden rounded-xl border border-black/10 bg-slate-50">
                      <img
                        src={`https://sitx-backend-new.onrender.com/uploads/${product.image}`}
                        alt={product.name || "Product"}
                        className="h-16 w-16 object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {product.name || "SitX Vest"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Qty: {product.quantity}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          ${money(product.price)}
                        </div>
                      </div>

                      {product.description && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">
                  ${money(subtotal)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                <span>Shipping</span>
                <span className="font-medium text-slate-900">Calculated</span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Total</span>
                <span className="text-xl font-semibold text-slate-900">
                  ${money(subtotal)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/Cart")}
              className="mt-5 w-full rounded-xl border border-black/10 bg-white px-6 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Back to Cart
            </button>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConfirmOrder;