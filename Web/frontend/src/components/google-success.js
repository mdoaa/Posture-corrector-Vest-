import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const GoogleSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("https://sitx.onrender.com/profile", {
          withCredentials: true,
        });

        if (res.data?.role === "admin") navigate("/admin");
        else navigate("/");
      } catch (error) {
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate]);

  return <p>Logging you in via Google...</p>;
};

export default GoogleSuccess;