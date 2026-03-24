import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SitxHistory from '../models/sensorHistory.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGOURI);

  const cursor = SitxHistory.find(
    { receivedAt: { $ne: null } },
    { b: 1, c: 1, receivedAt: 1 }
  )
    .sort({ receivedAt: 1 })
    .lean()
    .cursor();

  let count = 0;
  let startMs = null;
  let prevMs = null;
  let lastMs = null;
  let isV = false;
  let isPump = false;
  let vibrationObservedMs = 0;
  let airObservedMs = 0;

  for await (const rec of cursor) {
    const t = new Date(rec?.receivedAt).getTime();
    if (Number.isNaN(t)) continue;

    if (startMs === null) {
      startMs = t;
      prevMs = t;
      lastMs = t;
      count += 1;
      isV = Boolean(rec?.c);
      isPump = Boolean(rec?.b);
      continue;
    }

    const delta = Math.max(0, t - prevMs);
    if (isV) vibrationObservedMs += delta;
    if (isPump) airObservedMs += delta;

    prevMs = t;
    lastMs = t;
    isV = Boolean(rec?.c);
    isPump = Boolean(rec?.b);
    count += 1;
  }

  if (count === 0) {
    console.log(JSON.stringify({ error: 'No valid history records found.' }, null, 2));
    await mongoose.disconnect();
    return;
  }

  const nowMs = Date.now();
  let vibrationWithTailMs = vibrationObservedMs;
  let airWithTailMs = airObservedMs;
  const tail = Math.max(0, nowMs - lastMs);

  if (isV) vibrationWithTailMs += tail;
  if (isPump) airWithTailMs += tail;

  const out = {
    records: count,
    from: new Date(startMs).toISOString(),
    lastSampleAt: new Date(lastMs).toISOString(),
    now: new Date(nowMs).toISOString(),
    observedWindowHours: Number(((lastMs - startMs) / 3600000).toFixed(2)),
    observedOnly: {
      vibrationSeconds: Math.floor(vibrationObservedMs / 1000),
      vibrationMinutes: Number((vibrationObservedMs / 60000).toFixed(2)),
      vibrationHours: Number((vibrationObservedMs / 3600000).toFixed(2)),
      airChamberSeconds: Math.floor(airObservedMs / 1000),
      airChamberMinutes: Number((airObservedMs / 60000).toFixed(2)),
      airChamberHours: Number((airObservedMs / 3600000).toFixed(2))
    },
    includingTailToNow: {
      vibrationSeconds: Math.floor(vibrationWithTailMs / 1000),
      vibrationMinutes: Number((vibrationWithTailMs / 60000).toFixed(2)),
      vibrationHours: Number((vibrationWithTailMs / 3600000).toFixed(2)),
      airChamberSeconds: Math.floor(airWithTailMs / 1000),
      airChamberMinutes: Number((airWithTailMs / 60000).toFixed(2)),
      airChamberHours: Number((airWithTailMs / 3600000).toFixed(2))
    }
  };

  console.log(JSON.stringify(out, null, 2));
  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
