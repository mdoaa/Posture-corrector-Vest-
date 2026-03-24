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
        const parsedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isNaN(parsedLimit)
            ? 100
            : Math.min(Math.max(parsedLimit, 1), 500000);

        const parsedDays = Number.parseInt(req.query.days, 10);
        const hasDaysFilter = !Number.isNaN(parsedDays) && parsedDays > 0;
        const query = {};

        if (hasDaysFilter) {
            const rangeStart = new Date(Date.now() - parsedDays * 24 * 60 * 60 * 1000);
            query.receivedAt = { $gte: rangeStart };
        }

        const data = await SitxHistory.find(query).sort({ receivedAt: -1 }).limit(limit);
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No sensor history found' });
        }
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching sensor history:', err);
        res.status(500).json({ error: 'error fetching sensor history from database' });
    }
});

router.get('/sensorHistory/summary', async (req, res) => {
    try {
        const parsedDays = Number.parseInt(req.query.days, 10);
        const days = Number.isNaN(parsedDays) ? 7 : Math.min(Math.max(parsedDays, 1), 30);
        const rangeStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [latest, baseline] = await Promise.all([
            SitxHistory.findOne().sort({ receivedAt: -1 }).lean(),
            SitxHistory.findOne({ receivedAt: { $lt: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        ]);

        if (!latest) {
            return res.status(404).json({ error: 'No sensor history found' });
        }

        const toNumber = (value) => Number(value || 0);
        const summary = {
            days,
            rangeStart,
            latestAt: latest.receivedAt,
            slouchy: Math.max(0, toNumber(latest.i) - toNumber(baseline?.i)),
            left: Math.max(0, toNumber(latest.g) - toNumber(baseline?.g)),
            right: Math.max(0, toNumber(latest.f) - toNumber(baseline?.f)),
            normal: Math.max(0, toNumber(latest.h) - toNumber(baseline?.h)),
        };

        res.status(200).json(summary);
    } catch (err) {
        console.error('Error fetching sensor history summary:', err);
        res.status(500).json({ error: 'error fetching sensor history summary from database' });
    }
});

return router;
};
  
export default getSensorRoutes;