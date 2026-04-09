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
const STALE_ON_TAIL_LIMIT_SEC = 60;

const toNumber = (value) => Number(value || 0);

const toIsoOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toBool = (value) => Boolean(value);

const toValidDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const computeTransitionAndDuration = ({ records, baselineState, field, rangeStart, rangeEnd }) => {
    if (!records.length) {
        return {
            openedCount: 0,
            activeDurationSec: 0,
        };
    }

    let previousState = null;
    let previousAt = null;
    let openedCount = 0;
    let activeDurationSec = 0;

    for (const record of records) {
        const at = toValidDate(record.receivedAt);
        if (!at) {
            continue;
        }

        const currentState = toBool(record[field]);

        if (previousState === null) {
            // Initialize on first valid record
            previousState = currentState;
            previousAt = at;
        } else {
            // Count time when previousState was true
            if (previousState) {
                activeDurationSec += Math.max(0, (at.getTime() - previousAt.getTime()) / 1000);
            }

            // Count transitions
            if (currentState && !previousState) {
                openedCount += 1;
            }

            previousState = currentState;
            previousAt = at;
        }
    }

    // Handle tail: if still in active state, add time until now (capped by STALE limit)
    if (previousState && previousAt) {
        const cappedTailEnd = new Date(
            Math.min(rangeEnd.getTime(), previousAt.getTime() + STALE_ON_TAIL_LIMIT_SEC * 1000)
        );
        activeDurationSec += Math.max(0, (cappedTailEnd.getTime() - previousAt.getTime()) / 1000);
    }

    return {
        openedCount,
        activeDurationSec: Math.round(activeDurationSec),
    };
};

const preaggregationCache = {
    generatedAt: null,
    aggregatedMetrics: null,
    cachedAtMs: 0,
    expiresAtMs: 0,
};

let preaggregationRefreshPromise = null;
let preaggregationSchedulerStarted = false;

const buildHistoryWindowAggregate = async (days) => {
    const now = new Date();
    const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [latestInRangeHistory, baselineBeforeRangeHistory, historyRecords] = await Promise.all([
        SitxHistory.findOne({ receivedAt: { $gte: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxHistory.findOne({ receivedAt: { $lt: rangeStart } }).sort({ receivedAt: -1 }).lean(),
        SitxHistory.find(
            { receivedAt: { $gte: rangeStart } },
            {
                receivedAt: 1,
                a: 1,
                b: 1,
                c: 1,
                h: 1,
                i: 1,
                k: 1,
                l: 1,
                m: 1,
                vibrationActiveDurationSec: 1,
                airChamberActiveDurationSec: 1,
                valveOpenDurationSec: 1,
            }
        ).sort({ receivedAt: 1 }).lean(),
    ]);

    const recordsInRange = historyRecords.length;

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
    const deltaCounter = (field) =>
        Math.max(0, toNumber(latestInRangeHistory[field]) - toNumber(baselineBeforeRangeHistory?.[field]));

    const valveDerived = computeTransitionAndDuration({
        records: historyRecords,
        baselineState: baselineBeforeRangeHistory?.a,
        field: 'a',
        rangeStart,
        rangeEnd: now,
    });

    const pumpDerived = computeTransitionAndDuration({
        records: historyRecords,
        baselineState: baselineBeforeRangeHistory?.b,
        field: 'b',
        rangeStart,
        rangeEnd: now,
    });

    const vibrationDerived = computeTransitionAndDuration({
        records: historyRecords,
        baselineState: baselineBeforeRangeHistory?.c,
        field: 'c',
        rangeStart,
        rangeEnd: now,
    });

    // Legacy packed counters in history:
    // k => pump/air-chamber opens, l => vibration opens.
    const vibrationOpenedCount = deltaCounter('l') || vibrationDerived.openedCount || slouchyCount;
    const airChamberOpenedCount = deltaCounter('k') || pumpDerived.openedCount;
    const valveOpenedCount = deltaCounter('m') || valveDerived.openedCount;

    // Always use computed durations from state transitions, never stored values
    // (stored values may be outdated or calculated over different time ranges)
    const vibrationActiveDurationSec = vibrationDerived.activeDurationSec;
    const airChamberActiveDurationSec = pumpDerived.activeDurationSec;
    const valveOpenDurationSec = valveDerived.activeDurationSec;

    return {
        days,
        from: rangeStart.toISOString(),
        to: now.toISOString(),
        latestAt: toIsoOrNull(latestInRangeHistory?.receivedAt),
        recordsInRange,
        normalCount,
        slouchyCount,
        vibrationOpenedCount,
        airChamberOpenedCount,
        valveOpenedCount,
        vibrationActiveDurationSec,
        airChamberActiveDurationSec,
        valveOpenDurationSec,
    };
};

const buildAggregatedMetricsPayload = async () => {
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
    const hasFreshCache = preaggregationCache.aggregatedMetrics && preaggregationCache.expiresAtMs > now;

    if (!force && hasFreshCache) {
        return preaggregationCache;
    }

    if (preaggregationRefreshPromise) {
        return preaggregationRefreshPromise;
    }

    preaggregationRefreshPromise = (async () => {
        const aggregatedMetrics = await buildAggregatedMetricsPayload();

        const generatedAt = new Date().toISOString();
        const cachedAtMs = Date.now();

        preaggregationCache.generatedAt = generatedAt;
        preaggregationCache.aggregatedMetrics = aggregatedMetrics;
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
            metrics: preaggregationCache.aggregatedMetrics,
        };
    }

    if (hasAnyCache && !isFresh) {
        refreshPreaggregationCache({ force: true }).catch((err) => {
            console.error('Background pre-aggregation refresh failed:', err);
        });

        return {
            generatedAt: preaggregationCache.generatedAt,
            metrics: preaggregationCache.aggregatedMetrics,
        };
    }

    const cache = await refreshPreaggregationCache({ force: true });
    return {
        generatedAt: cache.generatedAt,
        metrics: cache.aggregatedMetrics,
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

    router.get('/sensorHistory/aggregated', async (req, res) => {
        try {
            const payload = await getPreaggregatedPayload();
            return res.status(200).json(payload);
        } catch (err) {
            console.error('Error fetching aggregated sensor history:', err);
            return res.status(500).json({ error: 'error fetching aggregated sensor history from database' });
        }
    });

    return router;
};

export default getSensorRoutes;
