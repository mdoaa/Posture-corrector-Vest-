const mqtt = require('mqtt');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');

// MongoDB connection
const mongoURI = 'mongodb+srv://graduation:Graduation2025@cluster0.kxm8jpk.mongodb.net/sitx?retryWrites=true&w=majority&appName=Cluster0';

// MQTT Broker
const brokerUrl = 'mqtt://broker.hivemq.com';
const mqttTopic = 'Omar';

// Schema definitions
const postureDataSchema = new mongoose.Schema({
  // System status
  a: Boolean,
  b: Boolean,
  c: Boolean,
  w: Boolean,
  x: Boolean,

  // MPU data
  d: { type: Number, default: 0 },  // Pitch
  e: { type: Number, default: 0 },  // Roll

  // Counters
  f: { type: Number, default: 0 },  // right
  g: { type: Number, default: 0 },  // left
  h: { type: Number, default: 0 },  // normal
  i: { type: Number, default: 0 },  // slouch
  j: { type: Number, default: 0 },  // pump
  k: { type: Number, default: 0 },  // vibration
  l: { type: Number, default: 0 },  // minute
  m: { type: Number, default: 0 },  // calibrationMinute
  n: { type: Number, default: 0 },  // pitchNormal
  o: { type: Number, default: 0 },  // pitchMild
  p: { type: Number, default: 0 },  // pitchSevere
  q: { type: Number, default: 0 },  // rollNormalRight
  r: { type: Number, default: 0 },  // rollModerateRight
  s: { type: Number, default: 0 },  // rollSevereRight
  t: { type: Number, default: 0 },  // rollNormalLeft
  u: { type: Number, default: 0 },  // rollModerateLeft
  v: { type: Number, default: 0 },  // rollSevereLeft
  y: { type: Number, default: 0 },  // percentages.normal
  z: { type: Number, default: 0 },  // percentages.right
  zz: { type: Number, default: 0 }, // percentages.left
  zzz: { type: Number, default: 0 }, // percentages.slouch
  
  // Timestamp
  timestamp: Number,
  receivedAt: { type: Date, default: Date.now }
}, { collection: 'Sitxsensor' });

// History schema (same structure but with accumulated counters)
const postureHistorySchema = new mongoose.Schema({
  // Same fields as postureDataSchema
  ...postureDataSchema.obj
}, { collection: 'Sitxhistory' });

// Models
const PostureData = mongoose.model('PostureData', postureDataSchema);
const PostureHistory = mongoose.model('PostureHistory', postureHistorySchema);

// Connect to MongoDB
async function connectMongo() {
  try {
    await mongoose.connect(mongoURI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

// Create HTTP server and Socket.io
const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Server running on port 3000');
});

// Update history with accumulated counters
async function updateHistory(newSensorData) {
  try {
    // Get the last history entry and the last sensor entry
    const [lastHistory, lastSensor] = await Promise.all([
      PostureHistory.findOne().sort({ receivedAt: -1 }).lean(),
      PostureData.findOne({ _id: { $ne: newSensorData._id } }).sort({ receivedAt: -1 }).lean()
    ]);
    
    // Counter fields to accumulate
    const counterFields = ['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 
                         'q', 'r', 's', 't', 'u', 'v', 'y', 'z', 'zz', 'zzz'];
    
    let newHistoryData;
    
    if (!lastHistory) {
      // First entry in history - use sensor data as is
      newHistoryData = { ...newSensorData.toObject() };
    } else {
      // Create new history entry
      newHistoryData = { ...newSensorData.toObject() };
      
      // For each counter field
      for (const field of counterFields) {
        const currentSensorValue = newSensorData[field];
        const lastSensorValue = lastSensor?.[field] || 0;
        
        if (currentSensorValue !== 0) {
          // Check if the sensor value has actually changed
          if (currentSensorValue !== lastSensorValue) {
            // Value changed - accumulate it
            newHistoryData[field] = Math.max(
              currentSensorValue,
              lastHistory[field] + 1
            );
          } else {
            // Value didn't change - keep the last history value
            newHistoryData[field] = lastHistory[field];
          }
        } else {
          // If sensor value is zero, keep the last history value
          newHistoryData[field] = lastHistory[field];
        }
      }
    }
    
    // Only save if there are actual changes in counter values
    if (lastHistory) {
      const hasChanges = counterFields.some(field => 
        newHistoryData[field] !== lastHistory[field]
      );
      
      if (!hasChanges) {
        console.log('🔄 No counter changes detected, skipping history update');
        return lastHistory;
      }
    }
    
    // Save to history collection
    const historyEntry = new PostureHistory(newHistoryData);
    await historyEntry.save();
    console.log('✅ History data updated');
    
    return historyEntry;
  } catch (err) {
    console.error('❌ History update error:', err);
    throw err;
  }
}

// Process incoming MQTT data
async function processIncomingData(message) {
  try {
    const data = JSON.parse(message.toString());
    console.log('📥 Received data:', JSON.stringify(data, null, 2));
    
    const doc = {
      ...data,
      receivedAt: new Date()
    };
    
    // Save raw data to sensor collection
    const newData = new PostureData(doc);
    await newData.save();
    console.log('✅ Data saved to MongoDB');
    
    // Update history with accumulated counters
    const historyData = await updateHistory(newData);
    
    // Emit both raw and accumulated data
    io.emit('Sitxsensor', { raw: newData, accumulated: historyData });
    
    return { raw: newData, accumulated: historyData };
  } catch (err) {
    console.error('❌ Processing error:', err);
    console.error('Raw message:', message.toString());
    throw err;
  }
}

// Main function
async function start() {
  await connectMongo();

  // MQTT client options
  const options = {
    keepalive: 60,
    reconnectPeriod: 1000,
    connectTimeout: 5000,
    clientId: 'posture_server_' + Math.random().toString(16).substr(2, 8)
  };

  const client = mqtt.connect(brokerUrl, options);

  client.on('connect', () => {
    console.log('🔗 Connected to MQTT broker');
    client.subscribe(mqttTopic, (err) => {
      if (err) {
        console.error('❌ Subscription error:', err);
      } else {
        console.log("📡 Subscribed to ${mqttTopic}");
      }
    });
  });

  client.on('message', async (topic, message) => {
    console.log("📨 Message received on ${topic}");
    try {
      await processIncomingData(message);
    } catch (err) {
      console.error('❌ Message processing failed:', err);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT error:', err);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    try {
      await client.end();
      await mongoose.disconnect();
      server.close();
      console.log('✅ All connections closed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Shutdown error:', err);
      process.exit(1);
    }
  });
}

start();