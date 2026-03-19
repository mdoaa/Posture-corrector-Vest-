import React from "react";
import NavBar from "./Nav";
import Footer from "./Footer";
import { useCart } from "./CartContext";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const { products, subtotal, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (productId, newQty) => {
    if (!Number.isFinite(newQty) || newQty < 1) return;
    updateQuantity(productId, newQty);
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
  };

  const money = (n) => (Number(n) || 0).toFixed(2);

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-14 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Review Your Cart
          </h1>
          <p className="mt-2 text-slate-600">
            Update quantities or remove items before checkout.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white/70 p-12 text-center shadow-sm backdrop-blur">
            <div className="text-2xl font-semibold">Your cart is empty 😢</div>
            <p className="mt-3 text-slate-600">
              Let’s add something that helps your posture.
            </p>
            <button
              onClick={() => navigate("/buyNow")}
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
            >
              Continue Shopping →
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* LEFT: Items */}
            <section className="lg:col-span-2 space-y-4">
              {products.map((product) => {
                const price = Number(product.price) || 0;
                const qty = Number(product.quantity) || 1;
                const lineTotal = price * qty;

                return (
                  <div
                    key={product._id}
                    className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur md:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                        <img
                          src={`https://sitx.onrender.com/uploads/${product.image}`}
                          alt={product.name}
                          className="h-32 w-full object-cover sm:h-28 sm:w-28"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {product.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              {product.description || "SitX vest"}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-slate-500">Price</div>
                            <div className="text-lg font-semibold">
                              ${money(price)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          {/* Qty controls */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700">
                              Qty
                            </span>

                            <div className="inline-flex items-center rounded-xl border border-black/10 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuantityChange(product._id, qty - 1)
                                }
                                className="h-10 w-10 rounded-l-xl text-slate-700 transition hover:bg-slate-50"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>

                              <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    product._id,
                                    parseInt(e.target.value || "1", 10)
                                  )
                                }
                                className="h-10 w-14 border-x border-black/10 bg-white text-center text-sm font-medium text-slate-900 outline-none"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  handleQuantityChange(product._id, qty + 1)
                                }
                                className="h-10 w-10 rounded-r-xl text-slate-700 transition hover:bg-slate-50"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemove(product._id)}
                              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                            >
                              Remove
                            </button>
                          </div>

                          {/* Line total */}
                          <div className="text-right">
                            <div className="text-xs text-slate-500">
                              Item total
                            </div>
                            <div className="text-base font-semibold text-slate-900">
                              ${money(lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* RIGHT: Summary */}
            <aside className="h-fit rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold">Subtotal</h2>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">Items</span>
                <span className="text-sm font-medium text-slate-900">
                  {products.reduce((a, p) => a + (Number(p.quantity) || 1), 0)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-600">Subtotal</span>
                <span className="text-xl font-semibold text-slate-900">
                  ${money(subtotal)}
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Taxes & shipping calculated at checkout.
              </p>

              <button
                className="mt-6 w-full rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
                onClick={() => navigate("/ConfirmOrder")}
              >
                CHECK OUT →
              </button>

              <button
                className="mt-3 w-full rounded-xl border border-black/10 bg-white px-6 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                onClick={() => navigate("/buyNow")}
              >
                CONTINUE SHOPPING
              </button>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
