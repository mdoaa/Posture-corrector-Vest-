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

SitX is an innovative solution to the physical strain caused by prolonged sitting. Unlike passive monitors that only provide alerts, SitX is a smart jacket that uses an array of sensors to detect slouching and provides active physical correction through pneumatic air chambers.

The system is fully integrated, allowing users to track their progress via a Flutter mobile app. All data is handled by a Node.js backend using MQTT for real-time performance and MongoDB Atlas for long-term storage.

### Key Features
- **Continuous Biometric Monitoring**: Force-sensitive mapping and gyroscopic sensors
- **Active Correction**: Pneumatic air pumps provide physical nudges
- **Redundant Connectivity**: Dual Wi‑Fi and multi‑broker MQTT
- **Health Analytics**: Mild, Moderate, Severe posture deviation tracking

---

## 🎥 Demo / Examples

### 📷 Images

| System View | Hardware View | Mobile App (Dashboard) | Mobile App (Control) |
| :---: |:---: | :---: | :---: |
| <img src="/system.jpg" width="200">|<img src="/vest.jpg" width="400"> | <img src="/mobilee.jpg" width="200"> | <img src="/mobile2.jpg" width="200"> |
| *Base Vest* | *Lumbar Add-on* | *ESP32 & MPU Sensor* | *Live Dashboard* | *Manual Control* |

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
The SitX jacket is designed for "Set and Forget" operation once calibrated.

* Initial Calibration: Upon wearing the jacket, sit in your ideal upright position and short-press the Right Button. The system will set the current Pitch/Roll and FSR values as the "Zero" reference. The OLED will display CALIBRATED.
* Manual Valve Override: If you wish to deflate the pneumatic chambers manually, long-press the Right Button for 2 seconds. This opens the relief valves.
* Haptic Toggle: Short-press the Left Button to toggle the vibration motor wave ON/OFF. The status will update on the OLED.

### 2. Logic & Actuation Flow
The firmware follows a multi-stage logic gate to prevent false positives:

1.  Detection: The ESP32 polls the 4 FSR sensors and the MPU6050 every 100ms.
2.  Validation: If the sensors detect a "Slouch" or "Lean" (e.g., Pitch > 10°), a timer starts.
3.  Haptic Alert: After 15 seconds of continuous poor posture, a vibration wave is triggered across the 8 motors along the back.
4.  Pneumatic Correction: If the user does not correct their posture, the system activates the Pumps to inflate the corrective air chambers.
5.  Data Sync: Every 5 seconds, the system sends a JSON payload via MQTT containing real-time angles, counter increments, and hardware states.

---
## Tech Stack

* Flutter & GetX: Mobile application development.
* React: Web landing page and customer portal.
* Node.js & MQTT: Real-time backend communication.
* MongoDB Atlas: Cloud storage for session logs.
* C++/Arduino: Firmware for ESP32 and sensor fusion.

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
