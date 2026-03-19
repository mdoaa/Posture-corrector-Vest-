import React, { useState, useEffect } from "react";
import NavBar from "./Nav";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const [productCount, setProductCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [visitsCount, setVisitsCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, statsRes, visitsRes] = await Promise.all([
          axios.get("https://sitx-backend-new.onrender.com/product", {
            withCredentials: true,
          }),
          axios.get("https://sitx-backend-new.onrender.com/admin/dashboard-stats", {
            withCredentials: true,
          }),
          axios.get("https://sitx-backend-new.onrender.com/visits/count", {
            withCredentials: true,
          }),
        ]);

        setProductCount(productsRes.data.count);
        setStats(statsRes.data);
        setVisitsCount(visitsRes.data.totalVisitors);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-14">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            Overview of your store performance and activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Total Products", value: productCount },
            { title: "Total Users", value: stats?.totalUsers || 0 },
            { title: "Total Orders", value: stats?.totalOrders || 0 },
            { title: "Orders (Last 10 Days)", value: stats?.recentOrdersCount || 0 },
            { title: "Total Visits", value: visitsCount || 0 },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:shadow-md"
            >
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
                {card.title}
              </h2>
              <p className="mt-4 text-3xl font-semibold text-slate-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-14">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/addProduct")}
              className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
            >
              + Add New Product
            </button>

            <button
              onClick={() => navigate("/allProducts")}
              className="rounded-xl border border-black/10 bg-white px-6 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              📦 View All Products
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        {stats?.recentOrders?.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-semibold">
              Recent Orders (Last 10 Days)
            </h2>

            <div className="mt-6 space-y-4">
              {stats.recentOrders.map((order, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {order.username}
                      </p>
                      <p className="text-sm text-slate-600">{order.email}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">
                        ${order.total}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;