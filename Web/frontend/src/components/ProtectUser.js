import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

const UserRoute = ({ children }) => {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/not-authorized" />;

  return children;
};

export default UserRoute;