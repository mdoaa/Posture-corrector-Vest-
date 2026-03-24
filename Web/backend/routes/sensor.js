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

const AGGREGETED_WINDOWS = [7, 14, 30, 180, 365];
const PREAGGREGATION_TTL_MS = 60 * 1000;

const toNumber = (value) => Number(value || 0);

const toIsoOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toValidTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
};

const preaggregationCache = {
    generatedAt: null,
    aggregatedMetrics: null,
    aggregetedMetrics: null,
    cachedAtMs: 0,
    expiresAtMs: 0,
};

let preaggregationRefreshPromise = null;
let preaggregationSchedulerStarted = false;

const buildWindowAggregate = async (days) => {
    const now = new Date();
    const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [latestInRangeHistory, baselineBeforeRangeHistory, latestInRangeSensor, baselineBeforeRangeSensor, rangeSensorRecords] = await Promise.all([
        SitxHistory.findOne({ receivedAt: { $gte: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxHistory.findOne({ receivedAt: { $lt: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxSensor.findOne({ receivedAt: { $gte: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxSensor.findOne({ receivedAt: { $lt: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxSensor.find(
            { receivedAt: { $gte: rangeStart } },
            { a: 1, b: 1, c: 1, receivedAt: 1 }
        ).sort({ receivedAt: 1 }).lean(),
    ]);

    if (!latestInRangeHistory && !latestInRangeSensor) {
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

    const normalCount = latestInRangeHistory
        ? Math.max(0, toNumber(latestInRangeHistory.h) - toNumber(baselineBeforeRangeHistory?.h))
        : 0;
    const slouchyCount = latestInRangeHistory
        ? Math.max(0, toNumber(latestInRangeHistory.i) - toNumber(baselineBeforeRangeHistory?.i))
        : 0;

    let vibrationActiveMs = 0;
    let airChamberActiveMs = 0;
    let valveOpenMs = 0;

    const rangeStartMs = rangeStart.getTime();
    const nowMs = now.getTime();

    let isVibrationEnabled = Boolean(baselineBeforeRangeSensor?.c);
    let isPumpRunning = Boolean(baselineBeforeRangeSensor?.b);
    let isValveOpen = Boolean(baselineBeforeRangeSensor?.a);

    let cursorMs = rangeStartMs;

    // --- الإضافة الجديدة: الحد الأقصى للوقت المسموح به (5 دقائق) ---
    const MAX_VALID_DURATION_MS = 5 * 60 * 1000; 

    for (const record of rangeSensorRecords) {
        const recordMs = toValidTime(record?.receivedAt);
        if (recordMs === null) {
            continue;
        }

        const boundedRecordMs = Math.min(Math.max(recordMs, rangeStartMs), nowMs);
        const deltaMs = Math.max(0, boundedRecordMs - cursorMs);

        // --- اللوجيك الجديد: لو الفارق أكتر من 5 دقايق، متضيفش الوقت ---
        // ملاحظة: لو حابب تحسب الـ 5 دقايق وترمي الباقي بدل ما تصفرها خالص، استخدم:
        // const effectiveDeltaMs = Math.min(deltaMs, MAX_VALID_DURATION_MS);
        const effectiveDeltaMs = deltaMs > MAX_VALID_DURATION_MS ? 0 : deltaMs;

        if (isVibrationEnabled) vibrationActiveMs += effectiveDeltaMs;
        if (isPumpRunning) airChamberActiveMs += effectiveDeltaMs;
        if (isValveOpen) valveOpenMs += effectiveDeltaMs;

        isVibrationEnabled = Boolean(record?.c);
        isPumpRunning = Boolean(record?.b);
        isValveOpen = Boolean(record?.a);
        cursorMs = boundedRecordMs;
    }

    // --- تطبيق اللوجيك على الوقت المتبقي في النهاية ---
    const tailMs = Math.max(0, nowMs - cursorMs);
    const effectiveTailMs = tailMs > MAX_VALID_DURATION_MS ? 0 : tailMs;

    if (isVibrationEnabled) vibrationActiveMs += effectiveTailMs;
    if (isPumpRunning) airChamberActiveMs += effectiveTailMs;
    if (isValveOpen) valveOpenMs += effectiveTailMs;

    const vibrationActiveDurationSec = Math.floor(vibrationActiveMs / 1000);
    const airChamberActiveDurationSec = Math.floor(airChamberActiveMs / 1000);
    const valveOpenDurationSec = Math.floor(valveOpenMs / 1000);

    return {
        days,
        from: rangeStart.toISOString(),
        to: now.toISOString(),
        latestAt: toIsoOrNull((latestInRangeSensor || latestInRangeHistory)?.receivedAt),
        recordsInRange: rangeSensorRecords.length,
        normalCount,
        slouchyCount,
        vibrationOpenedCount: vibrationActiveDurationSec,
        airChamberOpenedCount: airChamberActiveDurationSec,
        valveOpenedCount: valveOpenDurationSec,
        vibrationActiveDurationSec,
        airChamberActiveDurationSec,
        valveOpenDurationSec,
    };
};

const buildAggregatedMetricsPayload = async () => {
    const windows = await Promise.all(
        WINDOW_DEFINITIONS.map(async (windowDef) => {
            const summary = await buildWindowAggregate(windowDef.days);
            return [windowDef.key, summary];
        })
    );

    return Object.fromEntries(windows);
};

const buildAggregetedMetricsPayload = async () => {
    const windows = await Promise.all(
        AGGREGETED_WINDOWS.map(async (days) => {
            const summary = await buildWindowAggregate(days);
            return [`day${days}`, summary];
        })
    );

    return Object.fromEntries(windows);
};

const refreshPreaggregationCache = async ({ force = false } = {}) => {
    const now = Date.now();
    const hasFreshCache = preaggregationCache.aggregatedMetrics && preaggregationCache.expiresAtMs > now;

    if (!force && hasFreshCache) {
        return preaggregationCache;
    }

    if (preaggregationRefreshPromise) {
        return preaggregationRefreshPromise;
    }

    preaggregationRefreshPromise = (async () => {
        const [aggregatedMetrics, aggregetedMetrics] = await Promise.all([
            buildAggregatedMetricsPayload(),
            buildAggregetedMetricsPayload(),
        ]);

        const generatedAt = new Date().toISOString();
        const cachedAtMs = Date.now();

        preaggregationCache.generatedAt = generatedAt;
        preaggregationCache.aggregatedMetrics = aggregatedMetrics;
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

const getPreaggregatedPayload = async (type) => {
    const now = Date.now();
    const hasAnyCache = Boolean(preaggregationCache.generatedAt);
    const isFresh = preaggregationCache.expiresAtMs > now;

    if (hasAnyCache && isFresh) {
        return {
            generatedAt: preaggregationCache.generatedAt,
            metrics: type === 'aggregeted'
                ? preaggregationCache.aggregetedMetrics
                : preaggregationCache.aggregatedMetrics,
        };
    }

    if (hasAnyCache && !isFresh) {
        refreshPreaggregationCache({ force: true }).catch((err) => {
            console.error('Background pre-aggregation refresh failed:', err);
        });

        return {
            generatedAt: preaggregationCache.generatedAt,
            metrics: type === 'aggregeted'
                ? preaggregationCache.aggregetedMetrics
                : preaggregationCache.aggregatedMetrics,
        };
    }

    const cache = await refreshPreaggregationCache({ force: true });
    return {
        generatedAt: cache.generatedAt,
        metrics: type === 'aggregeted'
            ? cache.aggregetedMetrics
            : cache.aggregatedMetrics,
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
            const payload = await getPreaggregatedPayload('aggregeted');
            return res.status(200).json(payload);
        } catch (err) {
            console.error('Error fetching aggregeted sensor history:', err);
            return res.status(500).json({ error: 'error fetching aggregeted sensor history from database' });
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

    router.get('/sensor/aggregated', async (req, res) => {
        try {
            const payload = await getPreaggregatedPayload('aggregated');
            return res.status(200).json(payload);
        } catch (err) {
            console.error('Error fetching aggregated sensor data:', err);
            return res.status(500).json({ error: 'error fetching aggregated sensor data from database' });
        }
    });

    router.get('/sensorHistory/aggregated', async (req, res) => {
        try {
            const payload = await getPreaggregatedPayload('aggregated');
            return res.status(200).json(payload);
        } catch (err) {
            console.error('Error fetching aggregated sensor history:', err);
            return res.status(500).json({ error: 'error fetching aggregated sensor history from database' });
        }
    });

    return router;
};
  
export default getSensorRoutes;