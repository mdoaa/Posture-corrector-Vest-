import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

const AdminRoute = ({ children }) => {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>; // Optional spinner

  if (!user || user.role !== "admin") {
    return <Navigate to="/not-authorized" />;
  }

  return children;
};

export default AdminRoute;
