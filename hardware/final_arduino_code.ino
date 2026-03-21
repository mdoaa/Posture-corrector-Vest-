#include <Wire.h>
#include <Adafruit_MPU6050.h> 
#include <Adafruit_Sensor.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <mqtt_client.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLECharacteristic.h>
#include <Preferences.h>

// --- BLE UUIDs (must match Flutter app) ---
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// --- OLED Configuration ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1 
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- Sensor Configuration ---
Adafruit_MPU6050 mpu; 

// --- Pin Map (Updated for Myosa Board) ---
const int fsrPins[] = {36, 39, 34, 35};
const int motorPins[] = {25, 26, 27, 33};
const int pushButtonPins[] = {12, 14};
const int relayPins[] = {17, 16, 4}; // [0]=Pump1, [1]=Pump2, [2]=Valve

// --- New Global for OLED Logging ---
String lastLog = "System Ready";

// --- Counters Struct ---
struct Counters {
  uint16_t slouch = 0;
  uint16_t right = 0;
  uint16_t left = 0;
  uint16_t normal = 0;
  uint16_t pump = 0;
  uint16_t vibration = 0;
  uint16_t minute = 0;
  uint16_t pitchNormal = 0;
  uint16_t pitchMild = 0;
  uint16_t pitchModerate = 0;
  uint16_t pitchSevere = 0;
  uint16_t rollNormalRight = 0;
  uint16_t rollModerateRight = 0;
  uint16_t rollSevereRight = 0;
  uint16_t rollNormalLeft = 0;
  uint16_t rollModerateLeft = 0;
  uint16_t rollSevereLeft = 0;
  uint16_t calibrationMinute = 0;
} counters;

struct PosturePercentages {
  int normal = 0;
  int right = 0;
  int left = 0;
  int slouch = 0;
  void calculate(int normalCount, int rightCount, int leftCount, int slouchCount) {
    int total = normalCount + rightCount + leftCount + slouchCount;
    if (total > 0) {
      normal = (normalCount * 100) / total;
      right = (rightCount * 100) / total;
      left = (leftCount * 100) / total;
      slouch = 100 - (normal + right + left);
    } else {
      normal = right = left = slouch = 0;
    }
  }
};

// --- State Variables ---
struct States {
  bool rightButtonState = false;
  bool leftButtonState = false;
  bool vibrationEnabled = true;
  bool pumpRunning = false;
  bool valveOpen = false;
  bool systemLocked = false;
  bool fsr2WasHighest = false;
  bool fsr3WasHighest = false;
  bool fsr4WasHighest = false;
  bool initialPumpActivation = true;
  bool pumpsWereRunning = false;
  bool wifiConnected = false;
  bool mqttConnected = false;
  bool calibrationStarted = false;
  bool mpuCalibrated = false;
  
  // --- MANUAL STATES ---
  bool manualControl = false; // Master switch for manual mode
  bool manualInflate = false;
  bool manualDeflate = false;
} states;

// --- Average Helpers ---
struct Averages {
  float avg1 = 0, avg2 = 0;
  uint8_t avg1Count = 0, avg2Count = 0;
} averages;

// --- Calibration Data ---
struct Calibration {
  float refPitch = 0;
  float refRoll = 0;
} calibration;

// --- Timing Constants ---
const uint16_t slouchDelay = 15000;
const uint16_t fsr234Duration = 5000;
const uint16_t fsr1Duration = 15000;
const uint16_t pumpDurations[] = {27500, 20000, 10000};
const uint16_t valveOpenDuration = 60000;
const uint16_t avg1Duration = 10000;
const uint16_t avg2Interval = 25000;
const uint16_t vibrationCooldown = 3000;
const uint16_t mpuCheckInterval = 100;
const uint16_t printInterval = 1000;
const uint16_t timeInterval = 60000;
const uint16_t pitchUpdateInterval = 20000;
const uint16_t rollUpdateInterval = 20000;

// --- Fixed Wi-Fi Credentials (tried first) ---
const char* fixedSsids[] = {
  "ABDO"
};
const char* fixedPasswords[] = {
  "ABCD12abcd"
};
const uint8_t fixedWiFiCount = sizeof(fixedSsids) / sizeof(fixedSsids[0]);

// --- BLE / Preferences globals ---
Preferences preferences;
volatile bool newWifiReceived = false;
char bleNewSsid[65]     = "";
char bleNewPassword[65] = "";

// ==========================================
// إعدادات الـ MQTT (بدلاً من إعدادات الـ HTTP)
// ==========================================
const char* mqtt_ws_uri = "mqtt://broker.hivemq.com:1883";
const char* topic_data = "SitGuard/sensor/data/12345";
const char* topic_control = "SitGuard/device/control/12345";

esp_mqtt_client_handle_t mqttClient = nullptr;
// ==========================================

PosturePercentages percentages;

// --- Time Keepers ---
struct TimeKeeper {
  unsigned long lastPrint = 0;
  unsigned long lastMPUCheck = 0;
  unsigned long lastVibration = 0;
  unsigned long slouchStart = 0;
  unsigned long lastCounterIncrement = 0;
  unsigned long lastCounterRightIncrement = 0;
  unsigned long lastCounterLeftIncrement = 0;
  unsigned long lastCounterNormalIncrement = 0;
  unsigned long lastCounterSlouchIncrement = 0;
  unsigned long fsrHighStart[4] = {0};
  unsigned long valveCloseTime = 0;
  unsigned long pumpStopTime = 0;
  unsigned long avg1StartTime = 0;
  unsigned long lastAvg2Calc = 0;
  unsigned long lastReconnectAttempt = 0;
  unsigned long lastWiFiAttempt = 0;
  unsigned long lastPitchUpdate = 0;
  unsigned long lastRollUpdate = 0;
  unsigned long calibrationStartTime = 0;
} timeKeeper;

// --- Function Prototypes ---
void getSensorReadings(float &pitch, float &roll);
bool postSensorData(const char* payload);
void startPumpOperation(int duration);
void openValve();
void updateOLED();
static void mqttEventHandler(void* handler_args, esp_event_base_t base, int32_t event_id, void* event_data);

// ==========================================
// دالة استقبال الأوامر من زراير الويب عبر MQTT
// ==========================================
void mqttCallback(const String& topic, const String& message) {
  Serial.println("MQTT Topic: " + topic);
  Serial.println("MQTT CMD Received: " + message);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) return;

  String cmd = doc["cmd"];
  
  if (cmd == "manual") {
    states.manualControl = doc["state"];
    lastLog = states.manualControl ? "Manual: ON" : "Manual: OFF";
  } 
  else if (cmd == "inflate") {
    states.manualControl = true; 
    startPumpOperation(pumpDurations[0]); // تشغيل المضخة
    lastLog = "CMD: Inflate";
  } 
  else if (cmd == "deflate") {
    states.manualControl = true;
    openValve(); // فتح الصمام
    lastLog = "CMD: Deflate";
  }
  updateOLED();
}

static void mqttEventHandler(void* handler_args, esp_event_base_t base, int32_t event_id, void* event_data) {
  (void)handler_args;
  (void)base;

  esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;

  switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED: {
      Serial.println("connected");
      int subId = esp_mqtt_client_subscribe(mqttClient, topic_control, 0);
      bool subOk = subId >= 0;
      Serial.println(subOk ? "MQTT subscribe OK" : "MQTT subscribe FAILED");
      if (subOk) {
        Serial.println("Subscribed topic: " + String(topic_control));
      }
      states.mqttConnected = true;
      lastLog = "MQTT Connected";
      updateOLED();
      break;
    }

    case MQTT_EVENT_DISCONNECTED:
      states.mqttConnected = false;
      lastLog = "MQTT Failed";
      updateOLED();
      break;

    case MQTT_EVENT_DATA: {
      String topic;
      topic.reserve(event->topic_len);
      for (int i = 0; i < event->topic_len; i++) topic += event->topic[i];

      String payload;
      payload.reserve(event->data_len);
      for (int i = 0; i < event->data_len; i++) payload += event->data[i];

      mqttCallback(topic, payload);
      break;
    }

    default:
      break;
  }
}

// دالة الاتصال بالـ MQTT بدون يوزر/باسورد
void reconnectMQTT() {
  if (!states.wifiConnected) return;
  if (states.mqttConnected) return;

  Serial.print("Attempting MQTT connection...");

  if (mqttClient == nullptr) {
    esp_mqtt_client_config_t mqttConfig = {};
    mqttConfig.uri = mqtt_ws_uri;
    mqttConfig.disable_auto_reconnect = false;

    mqttClient = esp_mqtt_client_init(&mqttConfig);
    if (mqttClient == nullptr) {
      Serial.println("failed to init");
      states.mqttConnected = false;
      lastLog = "MQTT Failed";
      updateOLED();
      return;
    }

    esp_mqtt_client_register_event(
      mqttClient,
      (esp_mqtt_event_id_t)ESP_EVENT_ANY_ID,
      mqttEventHandler,
      nullptr
    );
    esp_mqtt_client_start(mqttClient);
    return;
  }

  esp_mqtt_client_reconnect(mqttClient);
  updateOLED();
}
// ==========================================


// --- SENSOR READER (NEW PCB ALIGNMENT + FOLDING BUG FIX) ---
void getSensorReadings(float &pitch, float &roll) {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // 1. Invert Axes
  float ax = -a.acceleration.x;
  float ay = -a.acceleration.y;
  float az = -a.acceleration.z;

  // 2. Direct Atan2 calculation
  float rawPitch = atan2(ay, az) * 180.0 / PI;
  float rawRoll  = atan2(ax, sqrt(ay * ay + az * az)) * 180.0 / PI; 

  // 3. Apply Calibration Offsets
  pitch = rawPitch - calibration.refPitch;
  roll = rawRoll - calibration.refRoll;

  // 4. FIX: NORMALIZE ANGLES
  if (pitch > 180.0) pitch -= 360.0;
  else if (pitch < -180.0) pitch += 360.0;
  
  if (roll > 180.0) roll -= 360.0;
  else if (roll < -180.0) roll += 360.0;

  // 5. FIX: INVERT PITCH DIRECTION
  pitch = -pitch; 
}

// --- OLED Update ---
void updateOLED() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  
  // Row 1: Network & Mode
  if (states.manualControl) {
    display.print("MODE: MANUAL");
  } else {
    display.print("MODE: AUTO");
  }
  
  // Row 2: Sensor Data (Pitch/Roll)
  display.setCursor(0, 10);
  if (states.mpuCalibrated) {
    float pitch, roll;
    getSensorReadings(pitch, roll);
    display.print("P:"); display.print(pitch, 0);
    display.print(" R:"); display.println(roll, 0);
  } else {
    display.println("MPU: Need Calib.");
  }

  // Row 3: Counters
  display.print("Slch:"); display.print(counters.slouch);
  display.print(" Nrm:");
  display.println(counters.normal);

  // Row 4: Status / Valves
  if(states.valveOpen) {
    display.print("VALVE: OPEN");
    if (!states.manualControl) {
       display.print(" ("); 
       display.print((timeKeeper.valveCloseTime - millis())/1000);
       display.print("s)");
    }
    display.println();
  } 
  else if(states.pumpRunning) {
    display.println("STATUS: PUMPING");
  } 
  else {
    display.println("Status: Idle");
  }

  // Row 5 & 6: The "Serial Monitor" area
  display.drawLine(0, 48, 128, 48, SSD1306_WHITE);
  display.setCursor(0, 50);
  display.print("LOG: ");
  display.println(lastLog); 
    
  display.display();
}

void printSystemStatus() {
  Serial.println("\n--- System Status ---");
  Serial.printf("WiFi: %s | MQTT: %s | Manual: %s\n", states.wifiConnected?"YES":"NO", states.mqttConnected?"YES":"NO", states.manualControl?"ON":"OFF");
  updateOLED();
}

// تعديل الدالة لترسل عبر الـ MQTT بدلاً من HTTP
bool postSensorData(const char* payload) {
  if (!states.mqttConnected || mqttClient == nullptr) {
    states.mqttConnected = false;
    return false;
  }
  
  // إرسال البيانات
  int msgId = esp_mqtt_client_publish(mqttClient, topic_data, payload, 0, 0, 0);
  bool ok = msgId >= 0;
  states.mqttConnected = ok;
  return ok;
}

void publishAllData() {
  percentages.calculate(counters.normal, counters.right, counters.left, counters.slouch);
  StaticJsonDocument<1024> doc; 

  doc["a"] = static_cast<bool>(states.valveOpen);
  doc["b"] = static_cast<bool>(states.pumpRunning);
  doc["c"] = static_cast<bool>(states.vibrationEnabled);

  if (states.mpuCalibrated) {
    float pitch, roll;
    getSensorReadings(pitch, roll);
    // FIX: Removed the negative sign because pitch is now corrected in getSensorReadings
    doc["d"] = static_cast<int8_t>(pitch);
    doc["e"] = static_cast<int8_t>(-roll);
  } else {
    doc["d"] = 0; doc["e"] = 0;
  }

  // Packing counters into JSON
  doc["f"] = counters.right;
  doc["g"] = counters.left;
  doc["h"] = counters.normal;
  doc["i"] = counters.slouch;
  doc["j"] = (counters.left+counters.right+counters.normal+counters.slouch);
  
  doc["w"] = states.wifiConnected;
  doc["x"] = states.mqttConnected;
  doc["y"] = percentages.normal;
  doc["z"] = percentages.right;
  doc["zz"] = percentages.left;
  doc["zzz"] = percentages.slouch;
  
  // Report Manual State
  doc["manual"] = states.manualControl;

  char jsonBuffer[1024];
  serializeJson(doc, jsonBuffer);

  if (postSensorData(jsonBuffer)) {
    Serial.println("MQTT publish successful");
    // lastLog = "MQTT: OK"; // اختياري عشان ما يغيرش اللوج كتير
  } else {
    Serial.println("MQTT publish failed");
    lastLog = "MQTT: FAIL";
  }
  printSystemStatus();
}

// --- BLE Write Callback ---
class WiFiCredentialCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
String value = pCharacteristic->getValue();
    if (value.isEmpty()) return;

    // Expected format: "WIFI:<ssid>:<password>"
    String data = String(value.c_str());
    if (!data.startsWith("WIFI:")) return;

    int firstColon = data.indexOf(':', 5);
    if (firstColon < 0) return;

    String ssid     = data.substring(5, firstColon);
    String password = data.substring(firstColon + 1);

    // Store in Preferences (NVS)
    preferences.begin("wifi", false);
    preferences.putString("ssid", ssid);
    preferences.putString("pass", password);
    preferences.end();

    ssid.toCharArray(bleNewSsid, sizeof(bleNewSsid));
    password.toCharArray(bleNewPassword, sizeof(bleNewPassword));
    newWifiReceived = true;

    Serial.printf("BLE: received WiFi credentials for SSID: %s\n", bleNewSsid);
  }
};

void setupBLE() {
  BLEDevice::init("SitGuard");
  BLEServer* pServer = BLEDevice::createServer();
  BLEService* pService = pServer->createService(BLE_SERVICE_UUID);
  BLECharacteristic* pCharacteristic = pService->createCharacteristic(
    BLE_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharacteristic->setCallbacks(new WiFiCredentialCallback());
  pService->start();
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("BLE: advertising as 'SitGuard'");
}

bool hasWiFiCredentials() {
  return bleNewSsid[0] != '\0';
}

bool hasAnyWiFiCredentials() {
  return fixedWiFiCount > 0 || hasWiFiCredentials();
}

void setupWiFi() {
  WiFi.mode(WIFI_STA); 
  WiFi.disconnect(true);
  delay(100);
  Serial.print("Connecting to WiFi...");
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("WiFi Connecting...");
  display.display();

  if (!hasAnyWiFiCredentials()) {
    states.wifiConnected = false;
    Serial.println("\nNo WiFi credentials available.");
    lastLog = "Await WiFi creds";
    return;
  }

  // 1) Try fixed credentials first
  for (uint8_t i = 0; i < fixedWiFiCount; i++) {
    Serial.printf("\nTrying fixed SSID: %s\n", fixedSsids[i]);
    WiFi.begin(fixedSsids[i], fixedPasswords[i]);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
      delay(500);
      Serial.print(".");
      display.print(".");
      display.display();
    }

    if (WiFi.status() == WL_CONNECTED) {
      states.wifiConnected = true;
      Serial.println("\nWiFi connected via fixed credentials!");
      lastLog = "WiFi Connected";
      return;
    }

    WiFi.disconnect();
    delay(300);
  }

  // 2) Fallback to BLE-provided credentials
  if (hasWiFiCredentials()) {
    Serial.printf("\nTrying BLE SSID: %s\n", bleNewSsid);
    WiFi.begin(bleNewSsid, bleNewPassword);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
      delay(500);
      Serial.print(".");
      display.print(".");
      display.display();
    }

    if (WiFi.status() == WL_CONNECTED) {
      states.wifiConnected = true;
      Serial.println("\nWiFi connected via BLE credentials!");
      lastLog = "WiFi Connected";
      return;
    }

    WiFi.disconnect();
  }

  states.wifiConnected = false;
  Serial.println("\nWiFi connect failed for fixed and BLE credentials.");
  lastLog = "WiFi Failed";
}

void checkNetwork() {
  if (!hasAnyWiFiCredentials()) {
    states.wifiConnected = false;
    states.mqttConnected = false;
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - timeKeeper.lastWiFiAttempt < 5000) return;
    timeKeeper.lastWiFiAttempt = now;

    states.wifiConnected = false;
    states.mqttConnected = false;
    setupWiFi();
  }
}

void calibrateMPU() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float ax = -a.acceleration.x;
  float ay = -a.acceleration.y;
  float az = -a.acceleration.z;

  calibration.refPitch = atan2(ay, az) * 180.0 / PI; 
  calibration.refRoll = atan2(ax, sqrt(ay * ay + az * az)) * 180.0 / PI; 
  
  // Reset logic
  for(int i=0; i<4; i++) timeKeeper.fsrHighStart[i] = 0;
  averages.avg1 = 0; averages.avg2 = 0;
  averages.avg1Count = 0;
  averages.avg2Count = 0;
    
  states.mpuCalibrated = true;
  states.calibrationStarted = true;
    
  lastLog = "Calibrated!";
  updateOLED();
  delay(1000);
}

void triggerVibrationWave() {
  if (!states.vibrationEnabled) return;
  for (int i = 0; i < 4; i++) {
    digitalWrite(motorPins[i], HIGH);
    delay(500);
    digitalWrite(motorPins[i], LOW);
  }
  counters.vibration++;
}

// --- Actuator Control Functions (Automatic Mode) ---
void startPumpOperation(int duration) {
  if (states.systemLocked || states.valveOpen || states.pumpRunning) return;
  digitalWrite(relayPins[0], LOW);
  digitalWrite(relayPins[1], LOW);
  states.pumpRunning = true;
  timeKeeper.pumpStopTime = millis() + duration;
  counters.pump++;
    
  if (duration == pumpDurations[0]) states.fsr2WasHighest = true;
  else if (duration == pumpDurations[1]) states.fsr3WasHighest = true;
  else if (duration == pumpDurations[2]) states.fsr4WasHighest = true;
  
  updateOLED();
}

void stopPumpOperation() {
  digitalWrite(relayPins[0], HIGH);
  digitalWrite(relayPins[1], HIGH);
  states.pumpRunning = false;
  states.pumpsWereRunning = true;
  updateOLED();
}

void openValve() {
  if (states.pumpRunning) stopPumpOperation();
  digitalWrite(relayPins[2], LOW);
  states.valveOpen = true;
  timeKeeper.valveCloseTime = millis() + valveOpenDuration;
  states.systemLocked = true;
  updateOLED();
}

void closeValve() {
  digitalWrite(relayPins[2], HIGH);
  states.valveOpen = false;
  states.systemLocked = false;
  updateOLED();
}

// --- BUTTON SERVICE ---
void serviceRightButton() {
  static bool prev = false;
  static unsigned long pressStart = 0;
  bool current = digitalRead(pushButtonPins[0]) == HIGH;
    
  if (current && !prev) pressStart = millis();
  if (!current && prev) {
    unsigned long held = millis() - pressStart;
    if (held >= 2000) {
      if (!states.manualControl) { 
        states.pumpsWereRunning = false;
        if (states.valveOpen) closeValve();
        else openValve();
      }
    } else if (held >= 1) {
       calibrateMPU();
    }
  }
  prev = current;
}

void serviceLeftButton() {
  static bool prev = false;
  static unsigned long pressStart = 0;
  bool current = digitalRead(pushButtonPins[1]) == HIGH;

  if (current && !prev) pressStart = millis();
  if (!current && prev) {
    unsigned long held = millis() - pressStart;
    if (held >= 1 && held <= 9000) {
      states.vibrationEnabled = !states.vibrationEnabled;
      lastLog = states.vibrationEnabled ? "Vib: ON" : "Vib: OFF";
      updateOLED();
      delay(500);
    }
  }
  prev = current;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(21, 22); 
  Wire.setClock(10000); 

  // Wake Up MPU
  Wire.beginTransmission(0x68);
  Wire.write(0x6B); 
  Wire.write(0); 
  Wire.endTransmission();

  // Setup Pins
  for (int pin : motorPins) pinMode(pin, OUTPUT);
  for (int pin : pushButtonPins) pinMode(pin, INPUT);
  for (int pin : relayPins) pinMode(pin, OUTPUT);
    
  // Relays OFF
  digitalWrite(relayPins[0], HIGH);
  digitalWrite(relayPins[1], HIGH);
  digitalWrite(relayPins[2], HIGH);

  // Init OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println(F("SSD1306 allocation failed"));
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10,20);
  display.println("System Init...");
  display.display();
  delay(1000);
    
  if (!mpu.begin()) {
    Serial.println("MPU Error!");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  // Load saved WiFi credentials from NVS (written by BLE)
  preferences.begin("wifi", true);
  String savedSsid = preferences.getString("ssid", "");
  String savedPass = preferences.getString("pass", "");
  preferences.end();
  if (savedSsid.length() > 0) {
    savedSsid.toCharArray(bleNewSsid, sizeof(bleNewSsid));
    savedPass.toCharArray(bleNewPassword, sizeof(bleNewPassword));
    Serial.printf("NVS: loaded saved SSID: %s\n", bleNewSsid);
  }

  setupWiFi();
  reconnectMQTT();

  setupBLE();
    
  lastLog = "System Ready";
}

void loop() {
  unsigned long now = millis();

  // Service Inputs
  serviceRightButton();
  serviceLeftButton();

  // Network Maintenance
  checkNetwork();

  // فحص حالة الـ MQTT وإعادة الاتصال إذا لزم الأمر
  if (states.wifiConnected && !states.mqttConnected) {
    if (now - timeKeeper.lastReconnectAttempt > 5000) {
      timeKeeper.lastReconnectAttempt = now;
      reconnectMQTT();
    }
  }

  // Apply new WiFi credentials received over BLE
  if (newWifiReceived) {
    newWifiReceived = false;
    Serial.printf("BLE: applying new WiFi SSID: %s\n", bleNewSsid);
    lastLog = "New WiFi creds";
    updateOLED();
    states.mqttConnected = false;
    states.wifiConnected = false;
    WiFi.disconnect(true);
    delay(500);
    setupWiFi();
  }

  // FSR Readings
  int fsrReadings[4];
  for (int i = 0; i < 4; i++) fsrReadings[i] = analogRead(fsrPins[i]);
  int maxFsr = 0;
  for(int i=0; i<4; i++) { if(fsrReadings[i] > maxFsr) maxFsr = fsrReadings[i]; }

  // ---------------------------------------------------------
  // AUTOMATIC CONTROL LOGIC (Only runs if Manual is FALSE)
  // ---------------------------------------------------------
  if (!states.manualControl) {
    
    // --- FSR Logic ---
    if (states.mpuCalibrated) {
      for (int i = 1; i < 4; i++) { // FSR 2,3,4
        if (fsrReadings[i] == maxFsr && fsrReadings[i] > 1) {
          if (!timeKeeper.fsrHighStart[i]) timeKeeper.fsrHighStart[i] = now;
          else if (now - timeKeeper.fsrHighStart[i] >= fsr234Duration && 
                   !states.pumpRunning && !states.valveOpen && !states.pumpsWereRunning) {
            startPumpOperation(pumpDurations[i - 1]);
            timeKeeper.fsrHighStart[i] = 0;
          }
          
          if(i==1) { // Average Calculation Logic (FSR 2)
            if (now - timeKeeper.avg1StartTime <= avg1Duration) {
               averages.avg1 += fsrReadings[1];
               averages.avg1Count++;
               timeKeeper.avg1StartTime = now;
               timeKeeper.lastAvg2Calc = now;
            } else if (now - timeKeeper.lastAvg2Calc <= 15000) {
               averages.avg2 += fsrReadings[1];
               averages.avg2Count++; 
            } else if (now - timeKeeper.lastAvg2Calc > 15000) {
               if(averages.avg1Count > 0 && averages.avg2Count > 0) {
                 float diff = fabs(averages.avg2 / averages.avg2Count) - fabs(averages.avg1 / averages.avg1Count);
                 if(diff > 2000) triggerVibrationWave();
               }
               if (now - timeKeeper.lastPitchUpdate >= 2000) {
                 counters.pitchModerate++;
                 timeKeeper.lastPitchUpdate = now;
               }
               timeKeeper.lastAvg2Calc = now;
               averages.avg2 = 0; averages.avg2Count = 0;
            }
          }
        } else { timeKeeper.fsrHighStart[i] = 0;
        }
      }
    }

    // FSR 1 Logic (Vibration)
    if (fsrReadings[0] == maxFsr && fsrReadings[0] > 1){
       if (!timeKeeper.fsrHighStart[0]) timeKeeper.fsrHighStart[0] = now;
       else if (now - timeKeeper.fsrHighStart[0] >= fsr1Duration) {
         triggerVibrationWave();
         if (now - timeKeeper.lastPitchUpdate >= 2000) {
           counters.pitchModerate++;
           timeKeeper.lastPitchUpdate = now;
         }
       }
    } else { timeKeeper.fsrHighStart[0] = 0;
    }

    // --- MPU Posture Logic ---
    if (states.mpuCalibrated && now - timeKeeper.lastMPUCheck >= mpuCheckInterval) {
      timeKeeper.lastMPUCheck = now;
      float pitch, roll;
      getSensorReadings(pitch, roll);

      // FIX: Strictly greater than 10 degrees forward, up to 180
      bool isForward = (pitch > 10 && pitch <= 180); 
      bool isRight = roll > 10;
      bool isLeft = roll < -10;

      if ((isForward || isLeft || isRight)) {
        if (now - timeKeeper.slouchStart >= slouchDelay && now - timeKeeper.lastVibration >= vibrationCooldown) {
           triggerVibrationWave();
           timeKeeper.lastVibration = now;
        }
        if (isForward && now - timeKeeper.lastCounterSlouchIncrement >= 20000) {
           counters.slouch++;
           timeKeeper.lastCounterSlouchIncrement = now;
        }
        if (isLeft && now - timeKeeper.lastCounterLeftIncrement >= 20000) {
           counters.left++;
           timeKeeper.lastCounterLeftIncrement = now;
        }
        if (isRight && now - timeKeeper.lastCounterRightIncrement >= 20000) {
           counters.right++;
           timeKeeper.lastCounterRightIncrement = now;
        }
      } else {
        timeKeeper.slouchStart = now;
        if (now - timeKeeper.lastCounterNormalIncrement >= 20000) {
           counters.normal++;
           timeKeeper.lastCounterNormalIncrement = now;
        }
      }
    }
    
    // Auto Shutdown
    if (states.valveOpen && timeKeeper.valveCloseTime < now) closeValve();
    if (states.pumpRunning && timeKeeper.pumpStopTime < now) stopPumpOperation();
  } 

  // --- Global Time-based Counters ---
  if (now - timeKeeper.lastCounterIncrement >= timeInterval) {
    counters.minute++;
    timeKeeper.lastCounterIncrement = now;
  }
  if (states.calibrationStarted && now - timeKeeper.calibrationStartTime >= timeInterval) {
    counters.calibrationMinute++;
    timeKeeper.calibrationStartTime = now;
  }

  // --- Reporting ---
  if (now - timeKeeper.lastPrint >= printInterval) {
    timeKeeper.lastPrint = now;
    publishAllData();
  }
   
  delay(10); 
}
