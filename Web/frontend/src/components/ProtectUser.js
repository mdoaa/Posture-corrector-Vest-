// components/AdminRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const UserRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user ) {
    return <Navigate to="/not-authorized" />;
  }

  return children;
};

export default UserRoute;
