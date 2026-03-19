import express from "express";
import Product from "../models/product.js";
import authMiddleware from "../middleware/authmiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/multer.js";
import User from "../models/user.js";
import Visit from "../models/visit.js";

const router = express.Router();

router.post("/admin/products",authMiddleware,adminMiddleware,upload.single("image"), async (req, res) => {
    try {
      const { name, price, description, stock } = req.body;
      const image = req.file ? req.file.filename : "";

      const product = new Product({ name, price, description, image, stock });
      await product.save();

      res.status(201).json(product);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to add product" });
    }
  }
);

router.get("/admin/product",authMiddleware,adminMiddleware,async (req, res) => {
    try {
      const products = await Product.find({});
      const count = products.length;
      res.status(200).json({ count, products });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }
);

router.put( "/admin/products/:id", authMiddleware, adminMiddleware,upload.single("image"), async (req, res) => {
  try {
    const updateData = {
      ...req.body,
    };

    // Handle uploaded image
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
);

router.get("/admin/dashboard-stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();

    // All orders across all users
    const users = await User.find({}, "orders username email").lean();
    
    // Flatten orders, ensuring user.orders exists
    const allOrders = users.flatMap(user =>
      Array.isArray(user.orders) ? 
        user.orders.map(order => ({
          ...order,
          username: user.username,
          email: user.email
        })) : []
    );

    const totalOrders = allOrders.length;

    // Orders in last 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const recentOrders = allOrders.filter(order => new Date(order.date) >= tenDaysAgo);

    res.json({
      totalUsers,
      totalOrders,
      recentOrdersCount: recentOrders.length,
      recentOrders,
      allOrders,
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/track-visit", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const visit = new Visit({ ip, userAgent });
    await visit.save();

    res.status(200).json({ message: "Visit tracked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to track visit" });
  }
});

router.get("/visits/count", authMiddleware, adminMiddleware, async (req, res) => {
  const count = await Visit.countDocuments();
  res.json({ totalVisitors: count });
});



export default router;
