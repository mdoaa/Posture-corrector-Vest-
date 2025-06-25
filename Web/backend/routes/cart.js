import express from "express";
import User from "../models/user.js";
import GuestCart from "../models/guestCart.js";
import auth from "../middleware/authmiddleware.js";
import Product from "../models/product.js";
import nodemailer from "nodemailer";
import mongoose from "mongoose";

const router = express.Router();

router.post("/add", async (req, res) => {
  const { guestId, userId, productId } = req.body;
  if (userId) {
    const user = await User.findById(userId);
    const existingItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      // Increment quantity
      existingItem.quantity += 1;
    } else {
      user.cart.push({ productId, quantity: 1 });
    }

    await user.save();
    return res.json(user);
    console.log(user);
  } else {
    let guestCart = await GuestCart.findOne({ guestId });
    if (!guestCart) guestCart = new GuestCart({ guestId, items: [] });

    const existingItem = guestCart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      guestCart.items.push({ productId, quantity: 1 });
    }
    await guestCart.save();
    return res.json(guestCart);
  }
});

router.post("/merge", auth, async (req, res) => {
  const userId = req.user.id;
  const { guestId } = req.body;
  console.log("Merging cart for user:", userId, "and guestId:", guestId);

  const guestCart = await GuestCart.findOne({ guestId });
  const user = await User.findById(userId);

  if (guestCart) {
    for (const item of guestCart.items) {
      const found = user.cart.find((i) => i.productId == item.productId);
      if (found) found.quantity = 1;
      else user.cart.push(item);
    }
    await user.save();
    await GuestCart.deleteOne({ guestId });
  }

  res.json({ message: "cart merged", user: user });
});

router.post("/confirm", async (req, res) => {
  try {
    const { userId, items, total, name, address, city, phone, email } =
      req.body;

    if (
      !userId ||
      items.length == 0 ||
      !total ||
      !name ||
      !address ||
      !city ||
      !phone
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product)
        return res
          .status(404)
          .json({ error: `Product not found: ${item.productId}` });

      if (product.stock < item.quantity) {
        return res
          .status(400)
          .json({ error: `Insufficient stock for ${product.name}` });
      }

      product.stock -= item.quantity;
      await product.save();
    }

    const newOrder = {
      items,
      total,
      name,
      address,
      city,
      phone,
      date: new Date(),
    };

    if (mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.orders.push(newOrder);
      user.cart = [];
      await user.save();
    } else {
      const guestCart = await GuestCart.findOne({ guestId: userId });
      if (!guestCart)
        return res.status(404).json({ error: "Guest cart not found" });
      guestCart.items = [];
      await guestCart.save();
    }

    console.log("Creating transporter...");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const itemListText = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product)
        return res
          .status(404)
          .json({ error: `Product not found: ${item.productId}` });

      itemListText.push(`- ${item.quantity} x ${product.name}`);
    }

    const emailText = `
Hello ${name},

Thank you for your order with SitX!

Here are your order details:
Name: ${name}
Phone: ${phone}
Address: ${address}, ${city}

Ordered Items:
${itemListText}

Total Price: $${total}

Your order has been successfully placed. We will notify you once it's shipped.

Best regards,
SitX Team
    `;

    console.log("Sending email to", email);
    const info = await transporter.sendMail({
      from: `"SitX" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Order Confirmation - SitX",
      text: emailText,
    });

    console.log("Email sent successfully:", info.messageId);

    res.status(201).json({ message: "Order confirmed", order: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to confirm order" });
  }
});

router.get("/product/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.json(product);
});

router.delete("/product/:id", async (req, res) => {
  const productId = req.params.id;
  const userId = req.user?.id;
  const guestId = req.body.guestId; // coming from frontend

  try {
    if (userId) {
      // Authenticated user
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.cart = user.cart.filter(
        (item) => item.productId.toString() !== productId
      );
      await user.save();

      return res
        .status(200)
        .json({ message: "Item removed from user cart", cart: user.cart });
    } else if (guestId) {
      // Guest user
      const guestCart = await GuestCart.findOne({ guestId });
      if (!guestCart)
        return res.status(404).json({ error: "Guest cart not found" });

      guestCart.items = guestCart.items.filter(
        (item) => item.productId.toString() !== productId
      );
      await guestCart.save();

      return res
        .status(200)
        .json({
          message: "Item removed from guest cart",
          cart: guestCart.cart,
        });
    } else {
      return res.status(400).json({ error: "No user or guest ID provided" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to remove item" });
  }
});

router.post("/updateQuantity", async (req, res) => {
  const { userId, guestId, productId, quantity } = req.body;

  try {
    if (userId) {
      const user = await User.findById(userId);
      const item = user.cart.find((i) => i.productId.toString() === productId);
      if (item) item.quantity = quantity;
      await user.save();
      return res.json({ message: "User cart updated", cart: user.cart });
    } else if (guestId) {
      let guestCart = await GuestCart.findOne({ guestId });
      if (!guestCart)
        return res.status(404).json({ error: "Guest cart not found" });
      const item = guestCart.items.find(
        (i) => i.productId.toString() === productId
      );
      if (item) item.quantity = quantity;
      await guestCart.save();
      return res.json({ message: "Guest cart updated", cart: guestCart.items });
    } else {
      return res.status(400).json({ error: "Missing userId or guestId" });
    }
  } catch (error) {
    console.error("Error updating quantity:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/cart", async (req, res) => {
  const { userId, guestId } = req.query;

  try {
    let cart;

    if (userId) {
      const user = await User.findById(userId);
      cart = user?.cart || [];
    } else if (guestId) {
      const guest = await GuestCart.findOne({ guestId });
      console.log("guest cart", guest);
      cart = guest?.items || [];
    } else {
      return res
        .status(400)
        .json({ message: "No userId or guestId provided." });
    }

    res.json({ cart });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart.", error });
  }
});

export default router;
