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
import getSensorRoutes from "./routes/sensor.js";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import SitxSensor from "./models/sensor.js";
import SitxHistory from "./models/sensorHistory.js";
import http from "http";
import mqtt from "mqtt"; // <-- تم إضافة مكتبة MQTT

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 8080;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or your Flutter app URL
    methods: ["GET", "POST"],
  },
});

// ==========================================
// إعدادات الـ MQTT المحمي (HiveMQ Cloud 24/7)
// ==========================================
const MQTT_BROKER = "mqtts://dbaf8b5235624f2385e15c4fd453a600.s1.eu.hivemq.cloud:8883"; 
const MQTT_TOPIC_DATA = "SitGuard/sensor/data/12345";
const MQTT_TOPIC_CONTROL = "SitGuard/device/control/12345";

const mqttOptions = {
  username: "opop1omar",
  password: "elpop2030aZ##"
};

const mqttClient = mqtt.connect(MQTT_BROKER, mqttOptions);

mqttClient.on("connect", () => {
  console.log("Connected to Secure HiveMQ Cloud ✅");
  mqttClient.subscribe(MQTT_TOPIC_DATA, (err) => {
    if (!err) {
      console.log(`Subscribed to MQTT Topic: ${MQTT_TOPIC_DATA}`);
    }
  });
});

// استقبال البيانات من الأردوينو عبر الـ MQTT بدلاً من HTTP
mqttClient.on("message", async (topic, message) => {
  if (topic === MQTT_TOPIC_DATA) {
    try {
      const payload = JSON.parse(message.toString());
      // console.log("MQTT Payload received:", payload);
      await processSensorPayload(payload);
    } catch (err) {
      console.error("Failed to parse MQTT message:", err);
    }
  }
});
// ==========================================

const COUNTER_FIELDS = [
  "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p",
  "q", "r", "s", "t", "u", "v", "y", "z", "zz", "zzz",
];

const isSensorPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (payload.eventType) {
    return false;
  }

  return payload.timestamp !== undefined || payload.a !== undefined || payload.d !== undefined;
};

const updateHistoryFromSensor = async (newSensorData) => {
  const [lastHistory, lastSensor] = await Promise.all([
    SitxHistory.findOne().sort({ receivedAt: -1 }).lean(),
    SitxSensor.findOne({ _id: { $ne: newSensorData._id } }).sort({ receivedAt: -1 }).lean(),
  ]);

  let newHistoryData;

  if (!lastHistory) {
    newHistoryData = { ...newSensorData.toObject() };
  } else {
    newHistoryData = { ...newSensorData.toObject() };

    for (const field of COUNTER_FIELDS) {
      const currentSensorValue = Number(newSensorData[field] || 0);
      const lastSensorValue = Number(lastSensor?.[field] || 0);
      const lastHistoryValue = Number(lastHistory[field] || 0);

      if (currentSensorValue !== 0) {
        if (currentSensorValue !== lastSensorValue) {
          newHistoryData[field] = Math.max(currentSensorValue, lastHistoryValue + 1);
        } else {
          newHistoryData[field] = lastHistoryValue;
        }
      } else {
        newHistoryData[field] = lastHistoryValue;
      }
    }
  }

  if (lastHistory) {
    const hasChanges = COUNTER_FIELDS.some((field) =>
      Number(newHistoryData[field] || 0) !== Number(lastHistory[field] || 0)
    );

    if (!hasChanges) {
      return lastHistory;
    }
  }

  const historyEntry = new SitxHistory(newHistoryData);
  await historyEntry.save();
  return historyEntry;
};

const processSensorPayload = async (payload) => {
  if (!isSensorPayload(payload)) {
    return null;
  }

  const newSensorData = new SitxSensor({
    ...payload,
    receivedAt: new Date(),
  });

  await newSensorData.save();
  const historyData = await updateHistoryFromSensor(newSensorData);
  io.emit("sensorData", newSensorData);
  io.emit("sensorHistoryData", historyData);
  return newSensorData;
};

// Socket.io listeners from web dashboard (تم تفعيل الأزرار لترسل عبر MQTT).
io.on("connection", (socket) => {
  console.log("Client connected to socket.io");

  // تفعيل/إلغاء وضع التحكم اليدوي
  socket.on("manualControl", (data) => {
    // data.state should be true or false
    const command = JSON.stringify({ cmd: "manual", state: data.state });
    mqttClient.publish(MQTT_TOPIC_CONTROL, command);
    socket.emit("controlStatus", { ok: true, message: `Manual mode set to ${data.state}` });
  });

  // زرار النفخ
  socket.on("inflate", () => {
    const command = JSON.stringify({ cmd: "inflate" });
    mqttClient.publish(MQTT_TOPIC_CONTROL, command);
    socket.emit("controlStatus", { ok: true, message: "Inflate command sent via MQTT" });
  });

  // زرار التفريغ
  socket.on("deflate", () => {
    const command = JSON.stringify({ cmd: "deflate" });
    mqttClient.publish(MQTT_TOPIC_CONTROL, command);
    socket.emit("controlStatus", { ok: true, message: "Deflate command sent via MQTT" });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected from socket.io");
  });
});

// middleware
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
  .then(() => console.log("connected to mongodb ✅"))
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

server.listen(port, () =>
  console.log("server is running on port " + port + " ✅")
);
