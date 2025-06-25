import NAV from "./Nav";
import "../component style/Admin.css";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const [productCount, setProductCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [visitsCount, setVisitsCount] = useState(0);

  useEffect(() => {
    // Fetch product count
    const fetchProductCount = async () => {
      try {
        const response = await axios.get("http://localhost:8080/admin/product", {
          withCredentials: true,
        });
        setProductCount(response.data.count);
      } catch (err) {
        console.error("Error fetching product count:", err);
      }
    };

    // Fetch user/order stats
    const fetchStats = async () => {
      try {
        const response = await axios.get("http://localhost:8080/admin/dashboard-stats", {
          withCredentials: true,
        });
        console.log(response.data);
        setStats(response.data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }
    };
    const visitsNumber = async () => {
    try {
      const response = await axios.get("http://localhost:8080/visits/count", {
        withCredentials: true,
      });
      console.log(response.data);
      setVisitsCount(response.data.totalVisitors);
    } catch (err) {
      console.error("Error fetching visits number:", err);
    }
  };

    fetchProductCount();
    fetchStats();
    visitsNumber();
  }, []);
  

  return (
    <div>
      <NAV />
      <div className="dashboard-container">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to your product admin dashboard</p>

        <div className="dashboard-cards">
          <div className="card">
            <h2>Total Products</h2>
            <p className="card-number">{productCount}</p>
          </div>
          <div className="card">
            <h2>Total Users</h2>
            <p className="card-number">{stats?.totalUsers || 0}</p>
          </div>
          <div className="card">
            <h2>Total Orders</h2>
            <p className="card-number">{stats?.totalOrders || 0}</p>
          </div>
          <div className="card">
            <h2>Orders in Last 10 Days</h2>
            <p className="card-number">{stats?.recentOrdersCount || 0}</p>
          </div>
          <div className="card">
            <h2>Visits Number </h2>
            <p className="card-number">{visitsCount || 0}</p>
          </div>
        </div>

        <h2 className="quick-actions-title">Quick Actions</h2>
        <div className="quick-actions">
          <button className="action-button" onClick={() => navigate("/addProduct")}>
            + Add New Product
          </button>
          <button className="action-button" onClick={() => navigate("/allProducts")}>
            📦 View All Products
          </button>
        </div>

        {stats?.recentOrders?.length > 0 && (
          <>
            <h2 className="quick-actions-title">Recent Orders (10 Days)</h2>
            <ul className="order-list">
              {stats.recentOrders.map((order, index) => (
                <li key={index} className="order-item">
                  <strong>{order.username}</strong> ({order.email}) - ${order.total} <br />
                  <small>{new Date(order.date).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
