# SitX – Smart Posture Correction Jacket

---

| PublishDate | Title | Excerpt | Logo |  Tags |
|:---- | :---- | :--- | :---| :-|
| 2026-01-01 | SitX – Smart Posture Correction Jacket | Monitor and correct your sitting posture in real-time with smart pneumatic feedback. | <img src="/coverr.jpg" width="400"> | IoT, Wearable-Tech, Health-Innovation, ESP32, Flutter, Node.js, Smart-Posture |

---

## 👥 Contributors

We would like to acknowledge the SitX team for their multidisciplinary contribution:

| Name                | Role                            | GitHub |
|---------------------|---------------------------------|--------|
| Doaa Mohamed        | Web Developer                   | [mdoaa](https://github.com/mdoaa) |
| Abdulrahman Ehab    | Hardware Design                 | [Abdo2496](https://github.com/Abdo2496) |
| Rawan Ahmed         | Mobile Developer                | [rrahmed43](https://github.com/rrahmed43) |
| Omar Ahmed          | Data scientist & Hardware Code   | [Opop1omar4645545](https://github.com/Opop1omar4645545) |

---

## 📌 Overview
SitX is an active posture training ecosystem designed to function as a preventative, digital physical therapist. Moving beyond traditional passive braces and simple vibration trackers, SitX integrates a lightweight smart vest with a proprietary SaaS mobile application.

At its core, SitX uses a single MPU spatial sensor combined with a custom AI classification model to detect postural errors accurately. When a bad posture is sustained, the system intervenes physically using a dynamic pneumatic Lumbar Add-on. The system is fully integrated, syncing real-time data via an MQTT-to-Node.js pipeline into a MongoDB Atlas database, providing actionable analytics and personalized corrective exercises through a Flutter app.

### Key Features
- **AI-Driven Spatial Tracking**: Advanced posture classification using raw MPU kinematics (No bulky FSRs required).
- **Active Coaching**: The app maps specific postural errors to personalized corrective exercises.
- **Dynamic Pneumatic Support**: Miniature air pumps and solenoid valves provide physical lower-back reinforcement exactly when muscles reach peak fatigue.
- **Privacy-First Architecture**: 100% reliant on discrete motion sensors, entirely eliminating the need for privacy-invasive cameras.
---

## 🎥 Demo / Examples

### 📷 Images

| System View | Hardware View | Mobile App (Dashboard) | Mobile App (chatbot) |Mobile App (states) | Mobile App (manual control) |
| :---: |:---: | :---: |:---: | :---: | :---: |
| <img src="/system.jpg" width="200">|<img src="/vest.jpg" width="400"> | <img src="/mobilee.jpg" width="200"> | <img src="/mobile2.jpg" width="200"> | <img src="/states.jpg" width="200"> | <img src="/manual.jpg" width="200"> |
| *All the project* | *main vest | *Live Dashboard* | *chatbot* | *States* | *Manual Control* |

---

---

## Features (Detailed)

### 1. Multi-Sensor Fusion
The system processes data from four Force Sensitive Resistors (FSRs) and an MPU6050 Accelerometer/Gyroscope from MYOSA kit. By calculating Pitch and Roll angles relative to a calibrated "Zero" point, SitX creates a digital map of the spine to identify slouching, leaning, or twisting.

### 2. Active Pneumatic Feedback
When poor posture is detected for more than 15 seconds, the system activates specialized air pumps. These inflate custom air chambers within the jacket, physically prompting the user to adjust their back. This is supplemented by a vibration "wave" for secondary alerts.

### 3. Industrial-Grade Connectivity
The firmware includes a robust network stack that automatically switches between multiple SSIDs and MQTT brokers to ensure the health monitoring is never interrupted. Data is pushed every 5 seconds in a compressed JSON format using the advanced ESP32 module sent by MYOSA.

---

## Usage Instructions

### 1. Hardware Operation & Calibration
* **Initial Calibration (Zero-Point Reset):** Over time, IMU sensors may experience slight drift. Users can easily reset their "neutral" baseline position directly from the Mobile App to ensure the AI model receives accurate reference points.
* **Manual Pneumatic Override:** If the user requires immediate lower-back comfort outside of the automatic AI triggers, they can manually inflate or deflate the air chambers via the app's manual control dashboard.

### 2. Logic & Actuation Flow
The firmware follows a multi-stage logic gate to prevent false positives (e.g., bending down to pick up a pen):
1. **Detection:** The ESP32 continuously polls the MPU sensor.
2. **AI Classification:** The model interprets the spatial data to identify states like "Slouching" or "Leaning."
3. **Time-Delay Validation:** A timer starts to ensure the poor posture is sustained for a specific duration (e.g., 15 seconds) before reacting.
4. **Intervention:** The system triggers instant haptic feedback and activates the pneumatic pumps to correct the spinal alignment.
5. **Active Coaching:** The app logs the specific error and prescribes a personalized corrective stretch based on the fatigued muscle group.



---
## Tech Stack

* **Mobile App:** Flutter & GetX (State Management).
* **AI Model:** Custom ML posture classification model based on biomechanical datasets.
* **Web Storefront:** React (hosted on Vercel).
* **Backend:** Node.js (RESTful API) & MQTT Broker.
* **Database:** MongoDB Atlas (Time-series data storage).
* **Hardware:** ESP32 Microcontroller, C++/Arduino firmware, MPU6500, Miniature Air Pumps, Solenoid Valves, 5V Relay.
---


## 📦 Installation

This section explains how to run **all parts of the SitX system**:
- Web backend & frontend
- Mobile application
- Arduino (ESP32) firmware
- MQTT → MongoDB data service

---

### ✅ Prerequisites
Make sure the following tools are installed on your system:

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **Flutter SDK** (for the mobile application)

Verify installations:
```bash
node -v
npm -v
flutter --version
```

---

### 🔧 Backend (Node.js – REST / API)

This service handles backend logic for the web application.

```bash
cd web/backend
npm install
npm start
```

📍 Runs on: `http://localhost:5000`

---

### 🌐 Frontend (React – Web Dashboard)

Open a **new terminal window** and run:

```bash
cd web/frontend
npm install
npm start
```

📍 Runs on: `http://localhost:3000`

---

### 📱 Mobile (Flutter)

Used for real‑time posture monitoring on mobile devices.

```bash
flutter clean
flutter pub get
```

---

### ▶️ Running the Project (Summary)

```
Backend   → http://localhost:5000
Frontend  → http://localhost:3000
Mobile    → Flutter application
```

---

### 🤖 Hardware / Firmware Installation (Arduino – ESP32)

This firmware runs on the ESP32 and handles posture sensing, feedback, and MQTT communication.

```
1. Install Arduino IDE
2. Install ESP32 board from Boards Manager
3. Install required libraries:
   - Adafruit SSD1306
   - Adafruit GFX
   - PubSubClient
   - ArduinoJson
   - AccelAndGyro (custom)
4. Open `final_arduino_code.ino`
5. Select "ESP32 Dev Module", choose the correct port, and Upload
```

---

### 🔧 Web Backend (MQTT → MongoDB)

This service listens to MQTT messages from the ESP32 and stores posture data in MongoDB.

⚠️ **Important:** This service must be running for Arduino data to be saved in the database.

```bash
cd Web
node final_node_send_data_to_mongo.js
```

---

### 🔄 System Data Flow (Explanation)

```
ESP32 → MQTT Broker → Node.js Service → MongoDB → Web / Mobile Apps
```


## 📁 Project Structure

```

sitx-project/
├─ mobile/
├─ web/
├─ hardware/
├─ demo.mp4
├─ cover.jpg
├─ front.jpg
├─ back.jpg
├─ hardware.jpg
├─ mobile.jpg
└─ README.md
```
