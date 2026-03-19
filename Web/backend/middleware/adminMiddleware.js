import User from "../models/user.js";

const adminMiddleware = async (req, res, next) => {
  try {
   // console.log(req);
    const user = await User.findById(req.user.id);
    console.log("from admin: " + user);
    if (user && user.role === "admin") {
      next();
    } else {
      res.status(403).json({ error: "Access denied" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export default adminMiddleware;
