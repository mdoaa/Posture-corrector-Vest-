import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "./UserContext";

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("https://sitx-backend-new.onrender.com/profile", {
          withCredentials: true,
        });

        setUser(res.data);

        if (res.data?.role === "admin") navigate("/admin");
        else navigate("/");
      } catch (error) {
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate, setUser]);

  return <p>Logging you in via Google...</p>;
};

export default GoogleSuccess;
