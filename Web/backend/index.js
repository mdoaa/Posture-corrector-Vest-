import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import authMiddleWare from "./middleware/authmiddleware.js";
import cartRoutes from "./routes/cart.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminMiddleware from "./middleware/adminMiddleware.js";
import session from "express-session";
import passport from "passport";
import "./config/passport.js";
import googleAuthRouter from "./routes/googleAuth.js";
// import sensorRoutes from './routes/sensor.js';
import getSensorRoutes from "./routes/sensor.js";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import SitxSensor from "./models/sensor.js";
import http from "http";
dotenv.config();

const app = express();
const port = process.env.PORT;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or your Flutter app URL
    methods: ["GET", "POST"],
  },
});
// middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from React frontend
    credentials: true, // If sending cookies or authentication headers
  })
);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make 'uploads/' folder publicly accessible
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: process.env.JWT_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//   setInterval(async () => {
//     const latestData = await SitxSensor.findOne().sort({ receivedAt: -1 });
//     if (latestData) {
//       io.emit('sensorData', latestData);
//     }
//   }, 5000);

// setInterval(async () => {
//   const latestData = await SitxSensor.findOne().sort({ receivedAt: -1 });
//   if (latestData && latestData.timestamp !== lastTimestamp) {
//     lastTimestamp = latestData.timestamp;
//     io.emit('sensorData', latestData);
//   }
// }, 3000);
let lastTimestampMillis = null;
setInterval(async () => {
  const latestData = await SitxSensor.findOne().sort({ receivedAt: -1 });

  if (latestData) {
    // Convert the Date object to milliseconds for comparison
    const currentTimestampMillis = latestData.receivedAt.getTime();

    if (currentTimestampMillis !== lastTimestampMillis) {
      lastTimestampMillis = currentTimestampMillis;
      io.emit("sensorData", latestData);
    }
  }
}, 3000);
mongoose
  .connect(process.env.MONGOURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("conneced to mongodb ✅"))
  .catch((err) => console.log("error in connection to mongodb", err));

app.use("/", authRouter);
app.use("/auth", googleAuthRouter);
app.use("/", cartRoutes);
app.use("/", adminRoutes);
// app.use('/', sensorRoutes);
app.use("/", getSensorRoutes(io));

app.get("/protected", authMiddleWare, (req, res) => {
  res.json({ message: "This is a protected route", userId: req.user });
});
app.get("admin/protected", authMiddleWare, adminMiddleware, (req, res) => {
  res.json({
    message: "This is a protected route for admin",
    userId: req.userId,
  });
});

//app.listen(port,'0.0.0.0',()=>console.log('server is running on port '+port +"✅"));
server.listen(port, () =>
  console.log("server is running on port " + port + "✅")
);
