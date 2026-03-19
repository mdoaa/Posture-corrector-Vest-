import express from 'express';
import SitxSensor from '../models/sensor.js';
import SitxHistory from '../models/sensorHistory.js';

// const router = express.Router();

const getSensorRoutes = (io) => {
    const router = express.Router();

router.get('/sensorData', async (req, res) => {
    try {
        const data = await SitxSensor.findOne().sort({ receivedAt: -1 });
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No sensor data found' });
        }
        res.status(200).json(data);
        
    }
    catch (err) {
        console.error('Error fetching sensor data:', err);
        res.status(500).json({ error: 'error fetching sensor data from database' });
    }
});
router.get('/sensorHistory', async (req, res) => {
    try {
        const data = await SitxHistory.find().sort({ receivedAt: -1 }).limit(100);
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No sensor history found' });
        }
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching sensor history:', err);
        res.status(500).json({ error: 'error fetching sensor history from database' });
    }
});

return router;
};
  
export default getSensorRoutes;