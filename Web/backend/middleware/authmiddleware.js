import jwt from "jsonwebtoken";
import User from '../models/user.js';

const authMiddleWare = async(req, res, next) => {
  const token = req.cookies.token;
  console.log("token from auth "+token);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      console.log("Decoded:", JSON.stringify(decoded, null, 2));
      const user = await User.findById(decoded.userId); // fetch user from DB
        if (!user) return res.status(401).json({ error: "User not found" });

      req.user = user; // ✅ attach full user to request
      console.log("from authmiddleware: " + req.user);
        next();
      } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
      }
};

export default authMiddleWare;