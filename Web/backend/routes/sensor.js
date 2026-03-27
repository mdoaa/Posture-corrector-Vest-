import express from 'express';
import SitxSensor from '../models/sensor.js';
import SitxHistory from '../models/sensorHistory.js';

const WINDOW_DEFINITIONS = [
    { key: 'today', days: 1 },
    { key: 'week', days: 7 },
    { key: 'twoWeeks', days: 14 },
    { key: 'month', days: 30 },
    { key: 'sixMonths', days: 180 },
    { key: 'year', days: 365 },
];

const PREAGGREGATION_TTL_MS = 60 * 1000;

const toNumber = (value) => Number(value || 0);

const toIsoOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const preaggregationCache = {
    generatedAt: null,
    aggregetedMetrics: null,
    cachedAtMs: 0,
    expiresAtMs: 0,
};

let preaggregationRefreshPromise = null;
let preaggregationSchedulerStarted = false;

const buildHistoryWindowAggregate = async (days) => {
    const now = new Date();
    const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [latestInRangeHistory, baselineBeforeRangeHistory, recordsInRange] = await Promise.all([
        SitxHistory.findOne({ receivedAt: { $gte: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxHistory.findOne({ receivedAt: { $lt: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxHistory.countDocuments({ receivedAt: { $gte: rangeStart } }),
    ]);

    if (!latestInRangeHistory) {
        return {
            days,
            from: rangeStart.toISOString(),
            to: now.toISOString(),
            latestAt: null,
            recordsInRange: 0,
            normalCount: 0,
            slouchyCount: 0,
            vibrationOpenedCount: 0,
            airChamberOpenedCount: 0,
            valveOpenedCount: 0,
            vibrationActiveDurationSec: 0,
            airChamberActiveDurationSec: 0,
            valveOpenDurationSec: 0,
        };
    }

    const normalCount = Math.max(0, toNumber(latestInRangeHistory.h) - toNumber(baselineBeforeRangeHistory?.h));
    const slouchyCount = Math.max(0, toNumber(latestInRangeHistory.i) - toNumber(baselineBeforeRangeHistory?.i));

    return {
        days,
        from: rangeStart.toISOString(),
        to: now.toISOString(),
        latestAt: toIsoOrNull(latestInRangeHistory?.receivedAt),
        recordsInRange,
        normalCount,
        slouchyCount,
        vibrationOpenedCount: 0,
        airChamberOpenedCount: 0,
        valveOpenedCount: 0,
        vibrationActiveDurationSec: 0,
        airChamberActiveDurationSec: 0,
        valveOpenDurationSec: 0,
    };
};

const buildAggregetedMetricsPayload = async () => {
    const windows = await Promise.all(
        WINDOW_DEFINITIONS.map(async (windowDef) => {
            const summary = await buildHistoryWindowAggregate(windowDef.days);
            return [windowDef.key, summary];
        })
    );

    return Object.fromEntries(windows);
};

const refreshPreaggregationCache = async ({ force = false } = {}) => {
    const now = Date.now();
    const hasFreshCache = preaggregationCache.aggregetedMetrics && preaggregationCache.expiresAtMs > now;

    if (!force && hasFreshCache) {
        return preaggregationCache;
    }

    if (preaggregationRefreshPromise) {
        return preaggregationRefreshPromise;
    }

    preaggregationRefreshPromise = (async () => {
        const aggregetedMetrics = await buildAggregetedMetricsPayload();

        const generatedAt = new Date().toISOString();
        const cachedAtMs = Date.now();

        preaggregationCache.generatedAt = generatedAt;
        preaggregationCache.aggregetedMetrics = aggregetedMetrics;
        preaggregationCache.cachedAtMs = cachedAtMs;
        preaggregationCache.expiresAtMs = cachedAtMs + PREAGGREGATION_TTL_MS;

        return preaggregationCache;
    })();

    try {
        return await preaggregationRefreshPromise;
    } finally {
        preaggregationRefreshPromise = null;
    }
};

const getPreaggregatedPayload = async () => {
    const now = Date.now();
    const hasAnyCache = Boolean(preaggregationCache.generatedAt);
    const isFresh = preaggregationCache.expiresAtMs > now;

    if (hasAnyCache && isFresh) {
        return {
            generatedAt: preaggregationCache.generatedAt,
            metrics: preaggregationCache.aggregetedMetrics,
        };
    }

    if (hasAnyCache && !isFresh) {
        refreshPreaggregationCache({ force: true }).catch((err) => {
            console.error('Background pre-aggregation refresh failed:', err);
        });

        return {
            generatedAt: preaggregationCache.generatedAt,
            metrics: preaggregationCache.aggregetedMetrics,
        };
    }

    const cache = await refreshPreaggregationCache({ force: true });
    return {
        generatedAt: cache.generatedAt,
        metrics: cache.aggregetedMetrics,
    };
};

const startPreaggregationScheduler = () => {
    if (preaggregationSchedulerStarted) {
        return;
    }

    preaggregationSchedulerStarted = true;

    refreshPreaggregationCache({ force: true }).catch((err) => {
        console.error('Initial pre-aggregation warmup failed:', err);
    });

    const timer = setInterval(() => {
        refreshPreaggregationCache({ force: true }).catch((err) => {
            console.error('Scheduled pre-aggregation refresh failed:', err);
        });
    }, PREAGGREGATION_TTL_MS);

    if (typeof timer.unref === 'function') {
        timer.unref();
    }
};

const getSensorRoutes = (io) => {
    const router = express.Router();
    startPreaggregationScheduler();

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

    router.get('/sensorHistory/aggregeted', async (req, res) => {
        try {
            const payload = await getPreaggregatedPayload();
            return res.status(200).json(payload);
        } catch (err) {
            console.error('Error fetching aggregeted sensor history:', err);
            return res.status(500).json({ error: 'error fetching aggregeted sensor history from database' });
        }
    });

    return router;
};

export default getSensorRoutes;