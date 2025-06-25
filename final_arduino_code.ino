#include <Wire.h>
#include <MPU9250_asukiaaa.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Pin Map
const int fsrPins[] = {36, 39, 34, 35};
const int motorPins[] = {25, 26, 27, 13};
const int pushButtonPins[] = {14, 12};
const int relayPins[] = {17, 16, 4};



// Counters
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

      // Ensure the total sum is exactly 100
      slouch = 100 - (normal + right + left);
    } else {
      normal = right = left = slouch = 0;
    }
  }
};
// State Variables
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
} states;

// Average Helpers
struct Averages {
  float avg1 = 0, avg2 = 0;
  uint8_t avg1Count = 0, avg2Count = 0;
} averages;

// Calibration Data
struct Calibration {
  float refPitch = 0;
  float refRoll = 0;
} calibration;

// Timing Constants
const uint16_t slouchDelay = 15000;
const uint16_t fsr234Duration = 5000;
const uint16_t fsr1Duration = 15000;
const uint16_t pumpDurations[] = {27500, 20000, 10000};
const uint16_t valveOpenDuration = 60000;
const uint16_t avg1Duration = 10000;
const uint16_t avg2Interval = 25000;
const uint16_t vibrationCooldown = 3000;
const uint16_t mpuCheckInterval = 100;
const uint16_t printInterval = 5000;
const uint16_t timeInterval = 60000;
const uint16_t pitchUpdateInterval = 20000;
const uint16_t rollUpdateInterval = 20000;

// Wi-Fi Networks
const char* ssids[] = {"OPPO A3", "MW70VK_50AD_2.4G"};
const char* passwords[] = {"12345677", "Rony0403"};

// MQTT Brokers
const char* mqtt_servers[] = {
  "broker.hivemq.com",
  "test.mosquitto.org"
};
const int mqtt_port = 1883;
const char* mqtt_topic = "Omar";

WiFiClient espClient;
PubSubClient client(espClient);

// Global Objects
MPU9250_asukiaaa mySensor;
PosturePercentages percentages;

int current_wifi_index = 0;
int current_mqtt_server = 0;

// Time Keepers
struct TimeKeeper {
  unsigned long lastPrint = 0;
  unsigned long lastMPUCheck = 0;
  unsigned long lastVibration = 0;
  unsigned long slouchStart = 0;
  unsigned long slouchStartt = 0;
  unsigned long lastCounterIncrement = 0;
  unsigned long lastCounterٌRightIncrement = 0;
  unsigned long lastCounterLeftIncrement = 0;
  unsigned long lastCounterNormalIncrement = 0;
  unsigned long lastCounterSlouchIncrement = 0;
  unsigned long fsrHighStart[4] = {0};
  unsigned long valveCloseTime = 0;
  unsigned long pumpStopTime = 0;
  unsigned long avg1StartTime = 0;  // Moved here
  unsigned long lastAvg2Calc = 0;
  unsigned long lastReconnectAttempt = 0;
  unsigned long lastPitchUpdate = 0;
  unsigned long lastRollUpdate = 0;
  unsigned long calibrationStartTime = 0;
} timeKeeper;

void printSystemStatus() {
  Serial.println("\n--- System Status ---");
  
  // Print all state variables
  Serial.println("\n--- State Variables ---");
  Serial.printf("Right Button State: %s\n", states.rightButtonState ? "Pressed" : "Released");
  Serial.printf("Left Button State: %s\n", states.leftButtonState ? "Pressed" : "Released");
  Serial.printf("Vibration Enabled: %s\n", states.vibrationEnabled ? "Yes" : "No");
  Serial.printf("Pump Running: %s\n", states.pumpRunning ? "Yes" : "No");
  Serial.printf("Valve Open: %s\n", states.valveOpen ? "Yes" : "No");
  Serial.printf("System Locked: %s\n", states.systemLocked ? "Yes" : "No");
  Serial.printf("FSR2 Was Highest: %s\n", states.fsr2WasHighest ? "Yes" : "No");
  Serial.printf("FSR3 Was Highest: %s\n", states.fsr3WasHighest ? "Yes" : "No");
  Serial.printf("FSR4 Was Highest: %s\n", states.fsr4WasHighest ? "Yes" : "No");
  Serial.printf("Initial Pump Activation: %s\n", states.initialPumpActivation ? "Yes" : "No");
  Serial.printf("Pumps Were Running: %s\n", states.pumpsWereRunning ? "Yes" : "No");
  Serial.printf("WiFi Connected: %s\n", states.wifiConnected ? "Yes" : "No");
  Serial.printf("MQTT Connected: %s\n", states.mqttConnected ? "Yes" : "No");
  Serial.printf("Calibration Started: %s\n", states.calibrationStarted ? "Yes" : "No");
  Serial.printf("MPU Calibrated: %s\n", states.mpuCalibrated ? "Yes" : "No");

  // Print all counters
  Serial.println("\n--- Counters ---");
  Serial.printf("Slouch Count: %d\n", counters.slouch);
  Serial.printf("Right Count: %d\n", counters.right);
  Serial.printf("Left Count: %d\n", counters.left);
  Serial.printf("Normal Count: %d\n", counters.normal);
  Serial.printf("Pump Activations: %d\n", counters.pump);
  Serial.printf("Vibration Activations: %d\n", counters.vibration);
  Serial.printf("Minute Counter: %d\n", counters.minute);
  Serial.printf("Pitch Normal Count: %d\n", counters.pitchNormal);
  Serial.printf("Pitch Mild Count: %d\n", counters.pitchMild);
  Serial.printf("Pitch Moderate Count: %d\n", counters.pitchModerate);
  Serial.printf("Pitch Severe Count: %d\n", counters.pitchSevere);
  Serial.printf("Roll Normal Right Count: %d\n", counters.rollNormalRight);
  Serial.printf("Roll Moderate Right Count: %d\n", counters.rollModerateRight);
  Serial.printf("Roll Severe Right Count: %d\n", counters.rollSevereRight);
  Serial.printf("Roll Normal Left Count: %d\n", counters.rollNormalLeft);
  Serial.printf("Roll Moderate Left Count: %d\n", counters.rollModerateLeft);
  Serial.printf("Roll Severe Left Count: %d\n", counters.rollSevereLeft);
  Serial.printf("Calibration Minute Counter: %d\n", counters.calibrationMinute);

  // Print sensor readings
  Serial.println("\n--- Sensor Readings ---");
  Serial.printf("FSR1: %d\n", analogRead(fsrPins[0]));
  Serial.printf("FSR2: %d\n", analogRead(fsrPins[1]));
  Serial.printf("FSR3: %d\n", analogRead(fsrPins[2]));
  Serial.printf("FSR4: %d\n", analogRead(fsrPins[3]));
  
  if (states.mpuCalibrated) {
    mySensor.accelUpdate();
    float ax = mySensor.accelX();
    float ay = mySensor.accelY();
    float az = mySensor.accelZ();
    float pitch = atan2(az, sqrt(ax * ax + ay * ay)) * 180.0 / PI - calibration.refPitch;
    float roll = atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / PI - calibration.refRoll;
    Serial.printf("Pitch: %.2f°\n", pitch);
    Serial.printf("Roll: %.2f°\n", roll);
  } else {
    Serial.println("MPU not calibrated - no pitch/roll data");
  }

  // Print timing information
  Serial.println("\n--- Timing Information ---");
  Serial.printf("Current millis(): %lu\n", millis());
  Serial.printf("Last Print: %lu (%lu ms ago)\n", timeKeeper.lastPrint, millis() - timeKeeper.lastPrint);
  Serial.printf("Last MPU Check: %lu (%lu ms ago)\n", timeKeeper.lastMPUCheck, millis() - timeKeeper.lastMPUCheck);
  Serial.printf("Last Vibration: %lu (%lu ms ago)\n", timeKeeper.lastVibration, millis() - timeKeeper.lastVibration);
  Serial.printf("Slouch Start: %lu (%lu ms ago)\n", timeKeeper.slouchStart, millis() - timeKeeper.slouchStart);
  Serial.printf("Last Counter Increment: %lu (%lu ms ago)\n", timeKeeper.lastCounterIncrement, millis() - timeKeeper.lastCounterIncrement);
  Serial.printf("Last Right Counter Increment: %lu (%lu ms ago)\n", timeKeeper.lastCounterٌRightIncrement, millis() - timeKeeper.lastCounterٌRightIncrement);
  Serial.printf("Last Left Counter Increment: %lu (%lu ms ago)\n", timeKeeper.lastCounterLeftIncrement, millis() - timeKeeper.lastCounterLeftIncrement);
  Serial.printf("Last Normal Counter Increment: %lu (%lu ms ago)\n", timeKeeper.lastCounterNormalIncrement, millis() - timeKeeper.lastCounterNormalIncrement);
  Serial.printf("Last Slouch Counter Increment: %lu (%lu ms ago)\n", timeKeeper.lastCounterSlouchIncrement, millis() - timeKeeper.lastCounterSlouchIncrement);
  Serial.printf("Valve Close Time: %lu (%lu ms remaining)\n", timeKeeper.valveCloseTime, timeKeeper.valveCloseTime - millis());
  Serial.printf("Pump Stop Time: %lu (%lu ms remaining)\n", timeKeeper.pumpStopTime, timeKeeper.pumpStopTime - millis());
  Serial.printf("Avg1 Start Time: %lu (%lu ms ago)\n", timeKeeper.avg1StartTime, millis() - timeKeeper.avg1StartTime);
  Serial.printf("Last Avg2 Calc: %lu (%lu ms ago)\n", timeKeeper.lastAvg2Calc, millis() - timeKeeper.lastAvg2Calc);
  Serial.printf("Last Reconnect Attempt: %lu (%lu ms ago)\n", timeKeeper.lastReconnectAttempt, millis() - timeKeeper.lastReconnectAttempt);
  Serial.printf("Last Pitch Update: %lu (%lu ms ago)\n", timeKeeper.lastPitchUpdate, millis() - timeKeeper.lastPitchUpdate);
  Serial.printf("Last Roll Update: %lu (%lu ms ago)\n", timeKeeper.lastRollUpdate, millis() - timeKeeper.lastRollUpdate);
  Serial.printf("Calibration Start Time: %lu (%lu ms ago)\n", timeKeeper.calibrationStartTime, millis() - timeKeeper.calibrationStartTime);

  // Print averages
  Serial.println("\n--- Averages ---");
  Serial.printf("Avg1: %.2f (count: %d)\n", averages.avg1, averages.avg1Count);
  Serial.printf("Avg2: %.2f (count: %d)\n", averages.avg2, averages.avg2Count);

  // Print percentages
  Serial.println("\n--- Posture Percentages ---");
  Serial.printf("Normal: %d%%\n", percentages.normal);
  Serial.printf("Right: %d%%\n", percentages.right);
  Serial.printf("Left: %d%%\n", percentages.left);
  Serial.printf("Slouch: %d%%\n", percentages.slouch);

  // Print calibration data
  Serial.println("\n--- Calibration Data ---");
  Serial.printf("Reference Pitch: %.2f°\n", calibration.refPitch);
  Serial.printf("Reference Roll: %.2f°\n", calibration.refRoll);
}

void publishAllData() {
  percentages.calculate(counters.normal, counters.right, counters.left, counters.slouch);
  StaticJsonDocument<512> doc;  // Adjusted size

  // System states
  doc["a"] = static_cast<bool>(states.valveOpen);
  doc["b"] = static_cast<bool>(states.pumpRunning);
  doc["c"] = static_cast<bool>(states.vibrationEnabled);

  // MPU data
  if (states.mpuCalibrated) {
    mySensor.accelUpdate();
    float ax = mySensor.accelX();
    float ay = mySensor.accelY();
    float az = mySensor.accelZ();
    float pitch = atan2(az, sqrt(ax * ax + ay * ay)) * 180.0 / PI - calibration.refPitch;
    float roll = atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / PI - calibration.refRoll;

    doc["d"] = static_cast<int8_t>(pitch >= 0 ? pitch : 0); // Forward only
    doc["e"] = static_cast<int8_t>(-round(roll));
  } else {
    doc["d"] = 0;
    doc["e"] = 0;
  }

  // Counters
  doc["f"] = static_cast<uint16_t>(counters.right);
  doc["g"] = static_cast<uint16_t>(counters.left);
  doc["h"] = static_cast<uint16_t>(counters.normal);
  doc["i"] = static_cast<uint16_t>(counters.slouch);
  doc["j"] = static_cast<uint8_t>(counters.left+counters.right+counters.normal+counters.slouch);
  doc['k']= static_cast<uint8_t>(counters.pitchModerate);
  doc["l"] = static_cast<uint8_t>(counters.minute);
  doc["m"] = static_cast<uint16_t>(counters.calibrationMinute);
  doc["n"] = static_cast<uint8_t>(counters.pitchNormal);
  doc["o"] = static_cast<uint8_t>(counters.pitchMild);
  doc["p"] = static_cast<uint8_t>(counters.pitchSevere);
  doc["q"] = static_cast<uint8_t>(counters.rollNormalRight);
  doc["r"] = static_cast<uint8_t>(counters.rollModerateRight);
  doc["s"] = static_cast<uint8_t>(counters.rollSevereRight);
  doc["t"] = static_cast<uint8_t>(counters.rollNormalLeft);
  doc["u"] = static_cast<uint8_t>(counters.rollModerateLeft);
  doc["v"] = static_cast<uint8_t>(counters.rollSevereLeft);

  // Connection states
  doc["w"] = static_cast<bool>(states.wifiConnected);
  doc["x"] = static_cast<bool>(states.mqttConnected);

  // Percentages
  doc["y"] = static_cast<uint8_t>(percentages.normal);
  doc["z"] = static_cast<uint8_t>(percentages.right);
  doc["zz"] = static_cast<uint8_t>(percentages.left);
  doc["zzz"] = static_cast<uint8_t>(percentages.slouch);
  // Serialize and publish
  char jsonBuffer[256];  // Match the document size
  serializeJson(doc, jsonBuffer);

  // Measure time before and after the publish call
  unsigned long startTime = millis();
  bool result = client.publish(mqtt_topic, jsonBuffer);
  unsigned long endTime = millis();

  if (result) {
    Serial.println("MQTT publish successful");
  } else {
    Serial.println("MQTT publish failed");
  }
 Serial.printf("time %lu ms\n", startTime); 
  Serial.printf("Publish took %lu ms\n", endTime - startTime);
  printSystemStatus();
}


void setupWiFi() {
  WiFi.disconnect(); // Ensure clean start
  Serial.print("Connecting to WiFi...");
  
  while (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssids[current_wifi_index], passwords[current_wifi_index]);
    unsigned long startAttemptTime = millis();
    
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
      delay(500);
      Serial.print(".");
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nFailed to connect to current WiFi. Switching...");
      current_wifi_index = (current_wifi_index + 1) % 2; // Switch to the next WiFi network
    } else {
      states.wifiConnected = true;
      Serial.println("\nWiFi connected");
      Serial.println("IP address: ");
      Serial.println(WiFi.localIP());
    }
  }
}


void reconnectMQTT() {
  if (!states.wifiConnected) {
    Serial.println("WiFi not connected, can't connect MQTT");
    return;
  }
  
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.print(mqtt_servers[current_mqtt_server]);
    client.setServer(mqtt_servers[current_mqtt_server], mqtt_port);
    if (client.connect("PostureCorrectorClient")) {
      states.mqttConnected = true;
      Serial.println("connected");
      client.subscribe(mqtt_topic);
    } else {
      states.mqttConnected = false;
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" trying another server...");
      current_mqtt_server = (current_mqtt_server + 1) % 2; // Switch to the next server
    }
  }
}

void checkNetwork() {
  if (WiFi.status() != WL_CONNECTED) {
    states.wifiConnected = false;
    states.mqttConnected = false;
    Serial.println("WiFi connection lost, attempting reconnect...");
    setupWiFi();
  }
}

void resetFsrLogic() {
  for (int i = 0; i < 4; i++) {
    timeKeeper.fsrHighStart[i] = 0;
  }
  averages.avg1 = averages.avg2 = 0;
  averages.avg1Count = averages.avg2Count = 0;
  states.fsr2WasHighest = states.fsr3WasHighest = states.fsr4WasHighest = false;
}

void calibrateMPU() {
  mySensor.accelUpdate();
  float ax = mySensor.accelX();
  float ay = mySensor.accelY();
  float az = mySensor.accelZ();
  calibration.refPitch = atan2(az, sqrt(ax * ax + ay * ay)) * 180.0 / PI;
  calibration.refRoll = atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / PI;
  resetFsrLogic();
  states.mpuCalibrated = true;
  states.calibrationStarted=true;
  Serial.println("MPU calibrated successfully");
  Serial.println(states.mpuCalibrated);
}

void triggerVibrationWave() {
  if (!states.vibrationEnabled) return;
  
  const int d = 500;
  for (int i = 0; i < 4; i++) {
    digitalWrite(motorPins[i], HIGH);
    delay(d);
    digitalWrite(motorPins[i], LOW);
  }
  counters.vibration++;
  Serial.println("Vibration triggered");
}

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

  Serial.println("Pump operation started");
}

void stopPumpOperation() {
  digitalWrite(relayPins[0], HIGH);
  digitalWrite(relayPins[1], HIGH);
  states.pumpRunning = false;
  states.pumpsWereRunning = true;
  Serial.println("Pump operation stopped");
}

void openValve() {
  if (states.pumpRunning) stopPumpOperation();
  
  digitalWrite(relayPins[2], LOW);
  states.valveOpen = true;
  timeKeeper.valveCloseTime = millis() + valveOpenDuration;
  Serial.println("Valve opened");
  states.systemLocked = true;
}

void closeValve() {
  digitalWrite(relayPins[2], HIGH);
  states.valveOpen = false;
  states.systemLocked = false;
  Serial.println("Valve closed");
}


void serviceRightButton() {
  static bool prev = false;
  static unsigned long pressStart = 0;
  bool current = digitalRead(pushButtonPins[0]) == HIGH;
  unsigned long now = millis();

  if (current && !prev) pressStart = now;
  if (!current && prev) {
    unsigned long held = now - pressStart;
    states.rightButtonState = held < 2000;
    if (held >= 2000) {
      states.pumpsWereRunning = false;
      if (states.valveOpen) {
        closeValve();
        states.systemLocked = false;
      } else {
        openValve();
      }
    } else if (held >= 1) {
       Serial.println("Short press detected, calibrating MPU and openenig the vlave");
      calibrateMPU();
    }
  }
  prev = current;
}

bool previousButtonState = false;
unsigned long buttonPressedTime = 0;

void serviceLeftButton() {
  bool currentButtonState = digitalRead(pushButtonPins[1]) == HIGH;
  unsigned long now = millis();

  if (currentButtonState && !previousButtonState) {
    buttonPressedTime = now;
  }
  if (!currentButtonState && previousButtonState) {
    unsigned long pressDuration = now - buttonPressedTime;
    if (pressDuration >= 1 && pressDuration <= 9000) {
      states.vibrationEnabled = !states.vibrationEnabled;
      Serial.print("Vibration ");
      Serial.println(states.vibrationEnabled ? "enabled" : "disabled");
    }
  }
  previousButtonState = currentButtonState;
}


void setup() {
  Serial.begin(115200);
  delay(1000);
  timeKeeper.lastCounterIncrement = millis();

  for (int pin : motorPins) pinMode(pin, OUTPUT);
  for (int pin : pushButtonPins) pinMode(pin, INPUT);
  for (int pin : relayPins) pinMode(pin, OUTPUT);
  digitalWrite(relayPins[0], HIGH);
  digitalWrite(relayPins[1], HIGH);
  digitalWrite(relayPins[2], HIGH);

  Wire.begin(21, 22);
  mySensor.setWire(&Wire);
  mySensor.beginAccel();
  mySensor.beginGyro();

  setupWiFi();
client.setServer(mqtt_servers[current_mqtt_server], mqtt_port);
  reconnectMQTT();

  Serial.println("System initialization complete");
}

void loop() {
  unsigned long now = millis();
  int fsrReadings[4];
  for (int i = 0; i < 4; i++) {
    fsrReadings[i] = analogRead(fsrPins[i]);
  }

  checkNetwork();
  if (!client.connected() && now - timeKeeper.lastReconnectAttempt > 5000) {
    timeKeeper.lastReconnectAttempt = now;
    reconnectMQTT();
  }
  
  client.loop();

  serviceRightButton();
  serviceLeftButton();

  int maxFsr = *std::max_element(fsrReadings, fsrReadings + 4);
  
  if (states.mpuCalibrated) {
    for (int i = 1; i < 4; i++) {
      if (fsrReadings[i] == maxFsr && fsrReadings[i] > 1) {
        if (!timeKeeper.fsrHighStart[i]) timeKeeper.fsrHighStart[i] = now;
        else if (now - timeKeeper.fsrHighStart[i] >= fsr234Duration && !states.pumpRunning && !states.valveOpen&&!states.pumpsWereRunning) {
          startPumpOperation(pumpDurations[i - 1]);
          timeKeeper.fsrHighStart[i] = 0;
        }
        if(i==1){
            if (now - timeKeeper.avg1StartTime <= avg1Duration) {
             averages.avg1 += fsrReadings[1];
             averages.avg1Count++;
             timeKeeper.avg1StartTime=now;
             timeKeeper.lastAvg2Calc=now;
            }
            else if (now - timeKeeper.lastAvg2Calc <=15000) {
            averages.avg2+= fsrReadings[1];
            averages.avg2Count++; 
            }
          else if (now - timeKeeper.lastAvg2Calc >15000) {
              Serial.printf("diffrence between averages: %d%%\n",fabs(averages.avg2 / averages.avg2Count) - fabs(averages.avg1 / averages.avg1Count));
            if(fabs(averages.avg2 / averages.avg2Count) - fabs(averages.avg1 / averages.avg1Count) > 2000)  {
              triggerVibrationWave();
            }
            if (now - timeKeeper.lastPitchUpdate >= 2000) {
            counters.pitchModerate++;
            timeKeeper.lastPitchUpdate = now;
            }
            timeKeeper.lastAvg2Calc=now;
             averages.avg2=0;
             averages.avg2Count=0;
          }
        }
      }
    }
  }

    if (fsrReadings[0] == maxFsr && fsrReadings[0] > 1){
       if (!timeKeeper.fsrHighStart[0]) timeKeeper.fsrHighStart[0] = now;
      else if (now - timeKeeper.fsrHighStart[0] >= fsr1Duration) {
        triggerVibrationWave();
        if (now - timeKeeper.lastPitchUpdate >= 2000) {
        counters.pitchModerate++;
        timeKeeper.lastPitchUpdate = now;
      }
    }
  }
  else {
     timeKeeper.fsrHighStart[0] = 0;
  }

  if (states.mpuCalibrated && now - timeKeeper.lastMPUCheck >= mpuCheckInterval) {
    timeKeeper.lastMPUCheck = now;
    mySensor.accelUpdate();
    float ax = mySensor.accelX();
    float ay = mySensor.accelY();
    float az = mySensor.accelZ();

    float pitch = atan2(az, sqrt(ax * ax + ay * ay)) * 180.0 / PI - calibration.refPitch;
    float roll = atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / PI - calibration.refRoll;
    roll=-roll;

    bool isForward = pitch > 10;
    bool isRight= roll > 10;
    bool isLeft = roll < -10;

      if ((isForward || isLeft || isRight) && now - timeKeeper.slouchStart >= slouchDelay && now - timeKeeper.lastVibration >= vibrationCooldown) {
      triggerVibrationWave();
      timeKeeper.lastVibration = now;
      Serial.println("Vibration triggered due to slouching!");
    } else if(!(isForward || isLeft || isRight)) {
      timeKeeper.slouchStart = now;
    }

    if (isForward) {
      if (now - timeKeeper.lastCounterSlouchIncrement >= 20000) {
        counters.slouch++;
        timeKeeper.lastCounterSlouchIncrement = now;
      }
    } if (isLeft) {
      if (now - timeKeeper.lastCounterٌRightIncrement >= 20000) {
        counters.left++;
        timeKeeper.lastCounterٌRightIncrement = now;
      }
    } if(isRight) {
      if (now - timeKeeper.lastCounterLeftIncrement >= 20000) {
        counters.right++;
        timeKeeper.lastCounterLeftIncrement = now;
      }
    } 
    if(!(isForward || isLeft || isRight)){
      if (now - timeKeeper.lastCounterNormalIncrement >= 20000) {
        counters.normal++;
        timeKeeper.lastCounterNormalIncrement = now;
      }
    }

    if (now - timeKeeper.lastPitchUpdate >= pitchUpdateInterval) {
      if (pitch < 10) counters.pitchNormal++;
      else if (pitch < 20) counters.pitchMild++;
      else if (pitch < 40) counters.pitchModerate++;
      else counters.pitchSevere++;
      timeKeeper.lastPitchUpdate = now;
    }

    if (now - timeKeeper.lastRollUpdate >= rollUpdateInterval) {
      if (roll >= 0 && roll < 10) counters.rollNormalLeft++;
      else if (roll >= 10 && roll < 30) counters.rollModerateLeft++;
      else if (roll >= 30) counters.rollSevereLeft++;
      else if (roll < 0 && roll > -10) counters.rollNormalRight++;
      else if (roll <= -10 && roll > -30) counters.rollModerateRight++;
      else counters.rollSevereRight++;
      timeKeeper.lastRollUpdate = now;
    }
  }

  if (now - timeKeeper.lastCounterIncrement >= timeInterval) {
    counters.minute++;
    timeKeeper.lastCounterIncrement = now;
  }

  if (states.calibrationStarted && now - timeKeeper.calibrationStartTime >= timeInterval) {
    counters.calibrationMinute++;
    timeKeeper.calibrationStartTime = now;
  }

  if (states.valveOpen && timeKeeper.valveCloseTime- now >valveOpenDuration){
     closeValve();
  }
    if (states.pumpRunning && millis() >= timeKeeper.pumpStopTime) {
    stopPumpOperation();
  }

  if (now - timeKeeper.lastPrint >= printInterval) {
    timeKeeper.lastPrint = now;
    publishAllData();
  }

  delay(500);
}