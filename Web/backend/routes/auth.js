import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import authMiddleWare from "../middleware/authmiddleware.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import EmailVerification from "../models/emailVerfication.js";
import Product from "../models/product.js";
import Experience from "../models/experience.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

require("dns").setDefaultResultOrder("ipv4first");

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const router = express.Router();
const sendOtpEmail = async (email, otp) => {
  try {
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

    console.log("Sending email to", email);
    const info = await transporter.sendMail({
      from: `"SitX" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
    });

    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Error in sendOtpEmail:", error);
    throw error; // rethrow so the outer function can handle it
  }
};

router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    console.log(email);
    const otp = generateOtp();
    console.log(otp);
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await EmailVerification.findOneAndUpdate(
      { email },
      { otpHash, expiresAt, verified: false },
      { upsert: true },
      console.log("otp sent")
    );

    await sendOtpEmail(email, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await EmailVerification.findOne({ email });

    if (!record) return res.status(400).json({ error: "OTP not requested" });

    if (record.verified) {
      return res.json({ message: "Email already verified" });
    }

    // Use bcrypt.compare() to compare the OTP with the hashed OTP in the database
    const isMatch = await bcrypt.compare(otp, record.otpHash);

    if (!isMatch || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    record.verified = true;
    await record.save();

    res.json({ message: "Email verified" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/register", async (req, res) => {
  console.time("RegisterAPI");
  const { username, email, password } = req.body;
  try {
    const verification = await EmailVerification.findOne({ email });

    if (!verification || !verification.verified) {
       console.timeEnd("RegisterAPI");
      return res.status(400).json({ error: "Email not verified" });
    }
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: "user already exists" });
    const user = new User({ username, email, password });
    await user.save();
     console.timeEnd("RegisterAPI");
    return res.status(200).json({ message: "User registerd successfully" });
  } catch (err) {
    console.timeEnd("RegisterAPI");
    res.status(500).json({ error: "server error" });
  }
});

router.post("/login", async (req, res) => {
  console.time("LoginAPI"); // Start timing

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log(user);

    if (!user) {
      console.timeEnd("LoginAPI"); // End timing before return
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.timeEnd("LoginAPI"); // End timing before return
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // set to true if using HTTPS
      sameSite: "Lax", 
      path: "/",
    });

    console.timeEnd("LoginAPI"); // End timing before return
    return res.status(200).json({ message: "login successfully", user: user });

  } catch (err) {
    console.timeEnd("LoginAPI"); // End timing in catch
    res.status(500).json({ Message: err.message });
  }
});


router.get("/profile", authMiddleWare, async (req, res) => {
  try {
    const user = req.user;
    console.log(user);
    if (!user) return res.status(404).json({ message: "user not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    path: "/",
    sameSite: "Lax", // or 'None' if using HTTPS
  });
  res.json({ message: "logged out successfully" });
  //.log(token);
});

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  //console.log(email);

  try {
    const user = await User.findOne({ email });
    console.log(user);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied: Not an admin" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie("token", token, { httpOnly: true });
    res.json({ message: "Admin login successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users", async (req, res) => {
  const users = await User.find();

  res.status(200).json(users);
});

router.post("/updatePassword", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "New password is required and must be at least 6 characters long.",
      });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.password = newPassword; // this triggers bcrypt pre-save hook
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error updating password", error });
  }
});

router.put("/update-password", async (req, res) => {
  const { email, currentpassword, password } = req.body;

  if (!currentpassword || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const isMatch = await user.comparePassword(currentpassword);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });
    else {
      user.password = password; // Just assign the raw password
      await user.save(); // Pre-save hook will handle hashing

      res.json({ message: "Password updated successfully" });
    }
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ error: "Server error updating password" });
  }
});

router.get("/check-email", async (req, res) => {
  const { email } = req.query; // Extract email from query parameters
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" });
  }

  try {
    const exist = await User.findOne({ email });
    return res.status(200).json({ exists: !!exist });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error while checking email" });
  }
});

router.put("/forget-password", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.password = password; // Just assign the raw password
    await user.save(); // Pre-save hook will handle hashing

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ error: "Server error updating password" });
  }
});

router.put("/update-profile", async (req, res) => {
  const { email, username } = req.body;

  if (!email || !username) {
    return res.status(400).json({ error: "Email and username are required" });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { username },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Server error while updating profile" });
  }
});

router.get("/products", async (req, res) => {
  console.time("FetchProductsAPI"); // Start timing
  try {
    const products = await Product.find({});
    console.timeEnd("FetchProductsAPI"); // End timing
    res.status(200).json(products);
  } catch (error) {
    console.timeEnd("FetchProductsAPI");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});
router.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/experience", async (req, res) => {
  try {
    const { user, text } = req.body;

    const newExperience = new Experience({
      user,
      text,
    });

    await newExperience.save();
    res.status(201).json({ message: "Experience saved successfully" });
  } catch (err) {
    console.error("Error saving experience:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/experience", async (req, res) => {
  try {
    const experiences = await Experience.find().sort({ date: -1 });
    res.json(experiences);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch experiences" });
  }
});

export default router;
