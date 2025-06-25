// pages/GoogleSuccess.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const GoogleSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userStr = params.get("user");

    if (userStr) {
      const user = JSON.parse(decodeURIComponent(userStr));
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } else {
      navigate("/login");
    }
  }, []);

  return <p>Logging you in via Google...</p>;
};

export default GoogleSuccess;
