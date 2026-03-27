import express from "express";

const router = express.Router();

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MAX_MESSAGE_LENGTH = 700;
const MAX_HISTORY_ITEMS = 12;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_COUNT = 20;
const AGGREGATED_FETCH_TIMEOUT_MS = 4500;
const AGGREGATED_PRIMARY_WINDOW = "week";
const AGGREGATED_FALLBACK_WINDOWS = ["today", "twoWeeks", "month", "sixMonths", "year"];
const AGGREGATED_WINDOW_SEQUENCE = [
  { key: "today", days: 1 },
  { key: "week", days: 7 },
  { key: "twoWeeks", days: 14 },
  { key: "month", days: 30 },
  { key: "sixMonths", days: 180 },
  { key: "year", days: 365 },
];

const requestBuckets = new Map();
const DEFAULT_SINGLE_USER_ID = "vest-single-user";

const detectLanguageHint = (text) => {
  const input = String(text || "").trim();
  if (!input) return "same-as-user";

  // Arabic Unicode block detection.
  if (/[\u0600-\u06FF]/.test(input)) return "arabic";
  return "english";
};

const getRequestOrigin = (req) => {
  const forwardedProtoRaw = req.headers["x-forwarded-proto"];
  const forwardedProto = Array.isArray(forwardedProtoRaw)
    ? forwardedProtoRaw[0]
    : String(forwardedProtoRaw || "").split(",")[0].trim();
  const proto = sanitizeText(forwardedProto, 10) || sanitizeText(req.protocol, 10) || "http";
  const host = sanitizeText(req.get("host"), 300);
  if (!host) return "";
  return `${proto}://${host}`;
};

const isLocalDebugRequest = (req) => {
  const host = String(req.get("host") || "").toLowerCase();
  const forwardedForRaw = req.headers["x-forwarded-for"];
  const forwardedFor = Array.isArray(forwardedForRaw)
    ? String(forwardedForRaw[0] || "")
    : String(forwardedForRaw || "").split(",")[0].trim();
  const ip = String(req.ip || "").toLowerCase();

  return (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    ip.includes("127.0.0.1") ||
    ip.includes("::1") ||
    forwardedFor.includes("127.0.0.1") ||
    forwardedFor.includes("::1")
  );
};

const fetchAggregatedContext = async (req) => {
  const origin = getRequestOrigin(req);
  const envBase = sanitizeText(process.env.PUBLIC_BASE_URL, 300);
  const candidates = [
    origin ? `${origin}/sensorHistory/aggregeted` : "",
    envBase ? `${envBase}/sensorHistory/aggregeted` : "",
  ].filter(Boolean);

  for (const endpoint of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AGGREGATED_FETCH_TIMEOUT_MS);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) continue;

      const data = await response.json();
      if (data && typeof data === "object" && data.metrics) {
        return {
          hasData: true,
          source: endpoint,
          generatedAt: data.generatedAt || null,
          metrics: data.metrics,
        };
      }
    } catch (error) {
      // Try the next candidate endpoint.
    }
  }

  return { hasData: false, source: null, generatedAt: null, metrics: {} };
};

const sanitizeWindowMetrics = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    days: clampNumber(source.days, 0, 3650),
    from: sanitizeText(source.from, 60),
    to: sanitizeText(source.to, 60),
    latestAt: sanitizeText(source.latestAt, 60),
    recordsInRange: clampNumber(source.recordsInRange, 0, 10_000_000),
    normalCount: clampNumber(source.normalCount, 0, 10_000_000),
    slouchyCount: clampNumber(source.slouchyCount, 0, 10_000_000),
    vibrationOpenedCount: clampNumber(source.vibrationOpenedCount, 0, 10_000_000),
    airChamberOpenedCount: clampNumber(source.airChamberOpenedCount, 0, 10_000_000),
    valveOpenedCount: clampNumber(source.valveOpenedCount, 0, 10_000_000),
    vibrationActiveDurationSec: clampNumber(source.vibrationActiveDurationSec, 0, 10_000_000),
    airChamberActiveDurationSec: clampNumber(source.airChamberActiveDurationSec, 0, 10_000_000),
    valveOpenDurationSec: clampNumber(source.valveOpenDurationSec, 0, 10_000_000),
  };
};

const sanitizeAggregatedMetrics = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const sanitized = {};

  for (const [windowKey, windowMetrics] of Object.entries(source)) {
    sanitized[sanitizeText(windowKey, 30)] = sanitizeWindowMetrics(windowMetrics);
  }

  return sanitized;
};

const pickBestAggregatedWindow = (metrics) => {
  if (!metrics || typeof metrics !== "object") return null;

  const primary = metrics[AGGREGATED_PRIMARY_WINDOW];
  if (primary) return { key: AGGREGATED_PRIMARY_WINDOW, metrics: primary };

  for (const key of AGGREGATED_FALLBACK_WINDOWS) {
    if (metrics[key]) return { key, metrics: metrics[key] };
  }

  const dynamicEntry = Object.entries(metrics).find(([, item]) => item && typeof item === "object");
  if (!dynamicEntry) return null;
  return { key: dynamicEntry[0], metrics: dynamicEntry[1] };
};

const inferTrendFromRatios = ({ slouchyShare, vibrationShare, hasDurationSignal }) => {
  if (hasDurationSignal) {
    if (vibrationShare >= 0.55) return "worsening";
    if (vibrationShare <= 0.35) return "improving";
    return "stable";
  }

  if (slouchyShare >= 0.55) return "worsening";
  if (slouchyShare <= 0.35) return "improving";
  return "stable";
};

const summarizeReadingsFromAggregated = (aggregatedMetrics) => {
  const windows = AGGREGATED_WINDOW_SEQUENCE.map((windowDef) => ({
    key: windowDef.key,
    days: windowDef.days,
    metrics: sanitizeWindowMetrics(aggregatedMetrics?.[windowDef.key]),
  })).filter((item) => item.metrics.recordsInRange > 0 || item.metrics.latestAt);

  if (windows.length === 0) {
    return {
      hasData: false,
      windowsAnalyzed: [],
      postureTotals: {
        normalCount: 0,
        slouchyCount: 0,
      },
      activityTotals: {
        vibrationActiveDurationSec: 0,
        airChamberActiveDurationSec: 0,
        vibrationOpenedCount: 0,
        airChamberOpenedCount: 0,
      },
      ratios: {
        slouchyShare: 0,
        normalShare: 0,
        vibrationShare: 0,
        airSupportShare: 0,
      },
      inferredTrend: "stable",
      insight: "No aggregated sensor metrics were available.",
    };
  }

  const totals = windows.reduce(
    (acc, item) => {
      acc.normalCount += item.metrics.normalCount;
      acc.slouchyCount += item.metrics.slouchyCount;
      acc.vibrationOpenedCount += item.metrics.vibrationOpenedCount;
      acc.airChamberOpenedCount += item.metrics.airChamberOpenedCount;
      acc.vibrationActiveDurationSec += item.metrics.vibrationActiveDurationSec;
      acc.airChamberActiveDurationSec += item.metrics.airChamberActiveDurationSec;
      return acc;
    },
    {
      normalCount: 0,
      slouchyCount: 0,
      vibrationOpenedCount: 0,
      airChamberOpenedCount: 0,
      vibrationActiveDurationSec: 0,
      airChamberActiveDurationSec: 0,
    }
  );

  const totalPostureEvents = totals.normalCount + totals.slouchyCount;
  const slouchyShare = totalPostureEvents > 0 ? Number((totals.slouchyCount / totalPostureEvents).toFixed(3)) : 0;
  const normalShare = totalPostureEvents > 0 ? Number((totals.normalCount / totalPostureEvents).toFixed(3)) : 0;

  const totalActive = totals.vibrationActiveDurationSec + totals.airChamberActiveDurationSec;
  const vibrationShare = totalActive > 0 ? Number((totals.vibrationActiveDurationSec / totalActive).toFixed(3)) : 0;
  const airSupportShare = totalActive > 0 ? Number((totals.airChamberActiveDurationSec / totalActive).toFixed(3)) : 0;
  const hasDurationSignal = totalActive > 0;

  const postureTrend = inferTrendFromRatios({ slouchyShare, vibrationShare, hasDurationSignal });

  const bestWindow = pickBestAggregatedWindow(aggregatedMetrics);
  const focusWindowKey = bestWindow?.key || windows[windows.length - 1]?.key || null;
  const focusWindowMetrics = sanitizeWindowMetrics(bestWindow?.metrics);
  const focusWindowEvents = focusWindowMetrics.normalCount + focusWindowMetrics.slouchyCount;
  const focusWindowSlouchyShare =
    focusWindowEvents > 0 ? Number((focusWindowMetrics.slouchyCount / focusWindowEvents).toFixed(3)) : 0;

  return {
    hasData: true,
    windowsAnalyzed: windows.map((item) => ({
      key: item.key,
      days: item.days,
      latestAt: item.metrics.latestAt,
      recordsInRange: item.metrics.recordsInRange,
      normalCount: item.metrics.normalCount,
      slouchyCount: item.metrics.slouchyCount,
      postureQualityRatio:
        item.metrics.normalCount + item.metrics.slouchyCount > 0
          ? Number((item.metrics.normalCount / (item.metrics.normalCount + item.metrics.slouchyCount)).toFixed(3))
          : 0,
      slouchyShare:
        item.metrics.normalCount + item.metrics.slouchyCount > 0
          ? Number((item.metrics.slouchyCount / (item.metrics.normalCount + item.metrics.slouchyCount)).toFixed(3))
          : 0,
      vibrationActiveDurationSec: item.metrics.vibrationActiveDurationSec,
      airChamberActiveDurationSec: item.metrics.airChamberActiveDurationSec,
    })),
    latestSnapshotAt: focusWindowMetrics.latestAt || null,
    focusWindow: {
      key: focusWindowKey,
      days: focusWindowMetrics.days,
      recordsInRange: focusWindowMetrics.recordsInRange,
      normalCount: focusWindowMetrics.normalCount,
      slouchyCount: focusWindowMetrics.slouchyCount,
      slouchyShare: focusWindowSlouchyShare,
      vibrationActiveDurationSec: focusWindowMetrics.vibrationActiveDurationSec,
      airChamberActiveDurationSec: focusWindowMetrics.airChamberActiveDurationSec,
    },
    postureTotals: {
      normalCount: totals.normalCount,
      slouchyCount: totals.slouchyCount,
    },
    activityTotals: {
      vibrationActiveDurationSec: totals.vibrationActiveDurationSec,
      airChamberActiveDurationSec: totals.airChamberActiveDurationSec,
      vibrationOpenedCount: totals.vibrationOpenedCount,
      airChamberOpenedCount: totals.airChamberOpenedCount,
    },
    ratios: {
      slouchyShare,
      normalShare,
      vibrationShare,
      airSupportShare,
    },
    inferredTrend: postureTrend,
    trendBasis: hasDurationSignal ? "duration" : "posture-counts",
    insight:
      postureTrend === "worsening"
        ? hasDurationSignal
          ? "Across aggregated windows, correction pressure is high versus support duration."
          : "Across aggregated windows, slouchy events are dominant over normal posture events."
        : postureTrend === "improving"
          ? hasDurationSignal
            ? "Across aggregated windows, support duration is stronger than correction duration."
            : "Across aggregated windows, normal posture events are dominant over slouchy events."
          : hasDurationSignal
            ? "Across aggregated windows, correction and support durations are relatively balanced."
            : "Across aggregated windows, normal and slouchy posture events are relatively balanced.",
  };
};

const buildCoachReadyAggregatedContext = ({ aggregatedMetrics, summary }) => {
  const windows = AGGREGATED_WINDOW_SEQUENCE.map((windowDef) => {
    const metrics = sanitizeWindowMetrics(aggregatedMetrics?.[windowDef.key]);
    const events = metrics.normalCount + metrics.slouchyCount;
    const slouchySharePct = events > 0 ? Number(((metrics.slouchyCount / events) * 100).toFixed(1)) : 0;

    return {
      key: windowDef.key,
      days: windowDef.days,
      recordsInRange: metrics.recordsInRange,
      latestAt: metrics.latestAt,
      postureEvents: {
        normalCount: metrics.normalCount,
        slouchyCount: metrics.slouchyCount,
        slouchySharePct,
      },
      deviceActivity: {
        vibrationOpenedCount: metrics.vibrationOpenedCount,
        airChamberOpenedCount: metrics.airChamberOpenedCount,
        vibrationActiveDurationSec: metrics.vibrationActiveDurationSec,
        airChamberActiveDurationSec: metrics.airChamberActiveDurationSec,
      },
    };
  });

  return {
    hasData: Boolean(summary?.hasData),
    trend: summary?.inferredTrend || "stable",
    trendBasis: summary?.trendBasis || "posture-counts",
    focusWindow: summary?.focusWindow || null,
    quickSummary: {
      insight: summary?.insight || "No aggregated insight available.",
      slouchySharePct: Number((Number(summary?.ratios?.slouchyShare || 0) * 100).toFixed(1)),
      vibrationSharePct: Number((Number(summary?.ratios?.vibrationShare || 0) * 100).toFixed(1)),
      airSupportSharePct: Number((Number(summary?.ratios?.airSupportShare || 0) * 100).toFixed(1)),
    },
    windows,
  };
};

const buildSensorInterpretationGuide = ({ summary, aggregatedContext }) => {
  const hasSummary = Boolean(summary?.hasData);
  const trend = summary?.inferredTrend || "stable";
  const slouchySharePct = Number(summary?.ratios?.slouchyShare || 0) * 100;
  const normalSharePct = Number(summary?.ratios?.normalShare || 0) * 100;
  const vibrationSharePct = Number(summary?.ratios?.vibrationShare || 0) * 100;
  const airSupportSharePct = Number(summary?.ratios?.airSupportShare || 0) * 100;

  const plainTrendMeaning =
    trend === "worsening"
      ? "Posture quality is getting worse in the selected window."
      : trend === "improving"
        ? "Posture quality is improving in the selected window."
        : "Posture quality is relatively stable in the selected window.";

  const severityHint =
    vibrationSharePct >= 60
      ? "High vibration correction pressure"
      : vibrationSharePct >= 35
        ? "Moderate vibration correction pressure"
        : "Low vibration correction pressure";

  const supportHint =
    airSupportSharePct >= 60
      ? "Strong air chamber support coverage"
      : airSupportSharePct >= 35
        ? "Moderate air chamber support coverage"
        : "Low air chamber support coverage";

  return {
    hasSummary,
    meanings: {
      normalCount: "number of normal posture events in the analyzed windows",
      slouchyCount: "number of slouching posture events in the analyzed windows",
      slouchyShare: "share of slouching events among posture events (normal + slouching)",
      normalShare: "share of normal posture events among posture events (normal + slouching)",
      vibrationActiveDurationSec: "duration where vibration correction was active",
      airChamberActiveDurationSec: "duration where air chamber support was active",
      vibrationShare: "share of vibration-active time across all analyzed windows",
      airSupportShare: "share of air-chamber-active time across all analyzed windows",
    },
    currentSnapshot: {
      normalCount: Number(summary?.postureTotals?.normalCount || 0),
      slouchyCount: Number(summary?.postureTotals?.slouchyCount || 0),
      vibrationActiveDurationSec: Number(summary?.activityTotals?.vibrationActiveDurationSec || 0),
      airChamberActiveDurationSec: Number(summary?.activityTotals?.airChamberActiveDurationSec || 0),
    },
    summaryReading: {
      inferredTrend: trend,
      trendBasis: summary?.trendBasis || "posture-counts",
      slouchySharePct: Number(slouchySharePct.toFixed(1)),
      normalSharePct: Number(normalSharePct.toFixed(1)),
      vibrationSharePct: Number(vibrationSharePct.toFixed(1)),
      airSupportSharePct: Number(airSupportSharePct.toFixed(1)),
      trendMeaning: plainTrendMeaning,
      severityHint,
      supportHint,
      insight: summary?.insight || "No summary insight available.",
    },
    coachingRuleHints: [
      "Use all windows (1/7/14/30/180/365 days) before deciding coaching intensity.",
      "If duration metrics are zero or unavailable, infer trend from normalCount vs slouchyCount.",
      "If vibrationShare is high, user likely needs frequent correction prompts.",
      "If airSupportShare is high, reinforce sustained support habits and gradual tapering.",
      "Do not merely repeat durations; explain what the pattern means and suggest next action.",
    ],
    aggregatedAvailability: Boolean(aggregatedContext?.hasData),
  };
};

const EMERGENCY_KEYWORDS = [
  "chest pain", "faint", "fainted", "numb", "numbness",
  "can not breathe", "can't breathe", "difficulty breathing",
  "severe pain", "emergency", "suicidal", "self harm", "self-harm",
];

// UPDATED: System Prompt tailored strictly for SitX hardware and features
const COACH_SYSTEM_PROMPT = [
  "You are SitX Coach, a friendly AI assistant integrated into the SitX smart ergonomic jacket.",
  "CONVERSATION STYLE: Be natural, conversational, and friendly. Keep replies short and suitable for mobile chat.",
  "Always reply in the same language as the user's latest message.",
  "",
  "RESPONSE FORMAT: Always respond with JSON (never plain text).",
  "",
  "WHEN USER ASKS A CASUAL/GENERAL QUESTION (e.g., 'Hi', 'How are you?', 'ازيك؟'):",
  "- messageType: 'greeting'",
  "- riskLevel: 'low'",
  "- reply: A warm, natural, friendly response (e.g., 'أنا بخير شكراً، كيفك أنت؟' or 'I'm doing great! How about you?')",
  "- suggestedAction: Optional friendly question or encouragement",
  "- deviceCommand: 'none'",
  "- options: Empty array or optional follow-up conversation starters",
  "",
  "WHEN USER ASKS ABOUT POSTURE, HEALTH, COMFORT, OR DEVICE:",
  "- messageType: One of 'alert', 'action', 'reinforcement', 'insight', 'safety'",
  "- riskLevel: 'low', 'medium', or 'high'",
  "- reply: Specialized coaching advice related to posture, comfort, or device usage",
  "- suggestedAction: Specific next step (e.g., 'Inflate the air chamber', 'Take a stretch break')",
  "- deviceCommand: Recommend device action if relevant ('inflate_chamber', 'deflate_chamber', 'enable_vibration', etc.)",
  "- options: 2-4 suggested follow-up actions",
  "",
  "MEDICAL SAFETY RULES:",
  "- Never diagnose, prescribe, or claim certainty about medical conditions.",
  "- If symptoms suggest emergency, reply with messageType 'safety' and advise immediate medical attention.",
  "- Recommend professional evaluation for persistent pain.",
  "- Do not alarm or shame users.",
  "",
  "DEVICE CONTEXT (for coaching mode only):",
  "- SitX jacket has Air Chamber (inflate to support posture, deflate to relieve pressure).",
  "- Use discomfortLevel, slouchDurationSec, and correctionsToday to personalize advice.",
  "- You receive aggregatedSensorContext directly from /sensorHistory/aggregeted and sensorReadingsSummary derived from it.",
  "- Do not use raw /sensorHistory in your reasoning. Use only aggregated windows and hardwareState.",
  "- Analyze all windows: 1, 7, 14, 30, 180, 365 days.",
  "- Use normalCount/slouchyCount as the primary posture quality signal.",
  "- Use vibrationActiveDurationSec and airChamberActiveDurationSec when they are available and non-zero.",
  "- You also receive sensorInterpretationGuide with explicit meanings and interpretation hints.",
  "- You also receive aggregatedCoachingContext with coach-ready per-window summaries.",
  "- Do not just repeat numbers. Explain what changed and what it means in simple words.",
  "- Convert summary signals to action: high slouchyShare or high vibrationShare => stronger corrective coaching; high normalShare or high airSupportShare => reinforce stable support habits.",
  "",
  "SPECIAL CASE: If asked about Omar, reply: 'اه ده برنس المشروع'",
  "",
  "JSON SCHEMA (ALWAYS use this structure):",
  '{"messageType":"greeting|alert|action|reinforcement|insight|safety","reply":"string","suggestedAction":"string","riskLevel":"low|medium|high","deviceCommand":"none|inflate_chamber|deflate_chamber|enable_vibration|disable_vibration","options":["string1","string2"]}'
].join("\n");

const clampNumber = (value, min, max, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};

const sanitizeText = (value, maxLength = MAX_MESSAGE_LENGTH) => {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
};

const hasEmergencyContent = (inputText) => {
  const normalized = inputText.toLowerCase();
  return EMERGENCY_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const isAskingAboutOmar = (inputText) => {
  const normalized = String(inputText || "").toLowerCase();
  return (
    normalized.includes("تعرف عمر") ||
    normalized.includes("do you know omar") ||
    normalized.includes("who is omar") ||
    normalized.includes("omar?")
  );
};

const enforceRateLimit = (key) => {
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= RATE_LIMIT_COUNT) {
    const retryAfterSec = Math.ceil((RATE_WINDOW_MS - (now - bucket.startedAt)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
};

const parseModelJson = (text) => {
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {
    const match = direct.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const sanitizeModelResponse = (value) => {
  const validTypes = new Set(["greeting", "alert", "action", "reinforcement", "insight", "safety"]);
  const validRisk = new Set(["low", "medium", "high"]);
  const validCommands = new Set(["none", "inflate_chamber", "deflate_chamber", "enable_vibration", "disable_vibration"]);

  const messageType = sanitizeText(value?.messageType, 20).toLowerCase();
  const riskLevel = sanitizeText(value?.riskLevel, 10).toLowerCase();
  const deviceCommand = sanitizeText(value?.deviceCommand, 25).toLowerCase();
  const options = Array.isArray(value?.options)
    ? value.options
        .map((item) => sanitizeText(String(item), 100))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    messageType: validTypes.has(messageType) ? messageType : "insight",
    riskLevel: validRisk.has(riskLevel) ? riskLevel : "low",
    deviceCommand: validCommands.has(deviceCommand) ? deviceCommand : "none",
    reply: sanitizeText(value?.reply, 500) || "Keep up the focus on your posture.",
    suggestedAction: sanitizeText(value?.suggestedAction, 220) || "Adjust your position if needed.",
    options,
  };
};

const resolveGroqConfig = () => {
  return {
    provider: "groq",
    apiKey: sanitizeText(process.env.GROQ_API_KEY, 400),
    model: sanitizeText(process.env.GROQ_MODEL, 120) || DEFAULT_GROQ_MODEL,
    endpoint: GROQ_ENDPOINT,
  };
};

const generateCoachReply = async (aiConfig, payload) => {
  const { apiKey, model, endpoint } = aiConfig;

  const requestBody = {
    model,
    stream: false,
    temperature: 0.2,
    messages: [
      { role: "system", content: COACH_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`AI request failed (${response.status}): ${responseText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) throw new Error("AI response did not include text content");

  const parsed = parseModelJson(text);
  if (!parsed) throw new Error("AI response was not valid JSON");

  return parsed;
};

// UPDATED: Lab UI with SitX specific fields
router.get("/posture-coach-lab", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const labBuildTag = new Date().toISOString();
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SitX Coach Lab</title>
    <style>
      :root {
        color-scheme: light;
        --bg1: #f8f9ff;
        --bg2: #edf2ff;
        --surface: #ffffff;
        --text: #1d2433;
        --muted: #607086;
        --userBubble: #7692ad;
        --coachBubble: #ffffff;
        --border: #d8e0eb;
        --chip: #f0f4fb;
        --chipBorder: #c9d4e3;
        --send: #3e6e9a;
        --sendDisabled: #a8b7c6;
        --danger: #b00020;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        color: var(--text);
        background: linear-gradient(165deg, var(--bg1), var(--bg2));
        display: grid;
        place-items: center;
        padding: 14px;
      }

      .phone {
        width: min(460px, 100%);
        height: min(860px, 92vh);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(35, 52, 84, 0.2);
        display: flex;
        flex-direction: column;
      }

      .top {
        padding: 14px 14px 10px;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, #f7f9fd 0%, #ffffff 100%);
      }

      .title {
        font-size: 16px;
        font-weight: 700;
        margin: 0;
      }

      .subtitle {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 12px;
      }

      .metaRow {
        margin-top: 10px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--muted);
      }

      .metaRow input {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 8px 10px;
        font: inherit;
      }

      .status {
        margin-top: 6px;
        color: var(--muted);
        font-size: 12px;
      }

      .chatList {
        flex: 1;
        overflow: auto;
        padding: 12px;
        background: #f7f9fc;
      }

      .bubbleWrap {
        display: flex;
        margin-bottom: 10px;
      }

      .bubbleWrap.user {
        justify-content: flex-end;
      }

      .bubbleWrap.coach {
        justify-content: flex-start;
      }

      .bubble {
        max-width: 78%;
        border-radius: 14px;
        padding: 10px 12px;
        font-size: 14px;
        line-height: 1.35;
        box-shadow: 0 3px 8px rgba(18, 35, 62, 0.08);
        white-space: pre-wrap;
        word-break: break-word;
      }

      .bubbleWrap.user .bubble {
        background: var(--userBubble);
        color: #ffffff;
      }

      .bubbleWrap.coach .bubble {
        background: var(--coachBubble);
        border: 1px solid var(--border);
      }

      .chips {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .chip {
        border: 1px solid var(--chipBorder);
        background: var(--chip);
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
      }

      .chip:disabled {
        opacity: 0.65;
        cursor: default;
      }

      .bottom {
        border-top: 1px solid var(--border);
        background: #fff;
        padding: 10px 12px 12px;
      }

      .composer {
        display: flex;
        gap: 8px;
      }

      textarea {
        flex: 1;
        resize: none;
        min-height: 42px;
        max-height: 110px;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px 11px;
        font: inherit;
      }

      textarea:focus,
      input:focus {
        outline: none;
        border-color: #8aa7c3;
        box-shadow: 0 0 0 3px rgba(103, 136, 168, 0.14);
      }

      button.send {
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 12px;
        color: #fff;
        background: var(--send);
        font-size: 18px;
        cursor: pointer;
      }

      button.send:disabled {
        background: var(--sendDisabled);
        cursor: default;
      }

      .err {
        margin-top: 6px;
        color: var(--danger);
        font-size: 12px;
        min-height: 16px;
      }

      .debug {
        margin-top: 8px;
        border-top: 1px dashed var(--border);
        padding-top: 8px;
      }

      .debug details {
        font-size: 12px;
        color: var(--muted);
      }

      .debug pre {
        margin: 8px 0 0;
        padding: 8px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fbfcff;
        color: #2b3645;
        overflow: auto;
        max-height: 180px;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="phone">
      <div class="top">
        <h1 class="title">SitX Coach Lab</h1>
        <p class="subtitle">Mobile-like chat UI using the same payload fields as Flutter chat.</p>
        <p class="subtitle">Build: ${labBuildTag}</p>
        <div class="metaRow">
          <input id="userId" value="mobile-user" placeholder="userId (email or mobile-user)" />
          <label class="toggle">
            <input id="includeModelPayload" type="checkbox" checked />
            Include model payload in API response (debug)
          </label>
        </div>
        <div class="status" id="status">Ready.</div>
        <div class="status" id="sensorStatus">sensorData: waiting...</div>
      </div>

      <div class="chatList" id="chatList"></div>

      <div class="bottom">
        <div class="composer">
          <textarea id="messageInput" placeholder="Type your question..."></textarea>
          <button class="send" id="sendBtn" aria-label="send">&#10148;</button>
        </div>
        <div class="err" id="error"></div>
        <div class="debug">
          <details>
            <summary>Debug payload preview</summary>
            <pre id="apiRaw"></pre>
            <pre id="modelRaw"></pre>
            <pre id="sentRaw"></pre>
          </details>
        </div>
      </div>
    </div>

    <script>
      const sendBtn = document.getElementById("sendBtn");
      const messageInput = document.getElementById("messageInput");
      const statusEl = document.getElementById("status");
      const sensorStatusEl = document.getElementById("sensorStatus");
      const errorEl = document.getElementById("error");
      const sentRawEl = document.getElementById("sentRaw");
      const modelRawEl = document.getElementById("modelRaw");
      const apiRawEl = document.getElementById("apiRaw");
      const chatList = document.getElementById("chatList");

      const SERVER_UNAVAILABLE = "Server is unavailable right now. Please try again later.";

      const messages = [
        {
          sender: "coach",
          text: "Hi, I am your posture coach. Ask me about your sitting habits.",
          options: [],
        },
      ];

      const clamp = (value, min, max) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.max(min, Math.min(max, number));
      };

      const derivePostureState = (normalCount, slouchyCount) => {
        if (slouchyCount > normalCount) return "slouching";
        if (normalCount > 0) return "good";
        return "unknown";
      };

      const deriveTrend = (normalCount, slouchyCount) => {
        if (slouchyCount > normalCount) return "worsening";
        if (normalCount > slouchyCount) return "improving";
        return "stable";
      };

      const scrollToBottom = () => {
        requestAnimationFrame(() => {
          chatList.scrollTop = chatList.scrollHeight;
        });
      };

      const renderMessages = () => {
        chatList.innerHTML = "";

        for (const item of messages) {
          const wrap = document.createElement("div");
          wrap.className = "bubbleWrap " + item.sender;

          const bubble = document.createElement("div");
          bubble.className = "bubble";
          bubble.textContent = item.text;
          wrap.appendChild(bubble);

          if (item.sender === "coach" && Array.isArray(item.options) && item.options.length > 0) {
            const chips = document.createElement("div");
            chips.className = "chips";

            for (const option of item.options) {
              const chip = document.createElement("button");
              chip.className = "chip";
              chip.type = "button";
              chip.textContent = option;
              chip.disabled = sendBtn.disabled;
              chip.addEventListener("click", () => sendMessage(option));
              chips.appendChild(chip);
            }

            bubble.appendChild(chips);
          }

          chatList.appendChild(wrap);
        }

        scrollToBottom();
      };

      const setLoading = (loading) => {
        sendBtn.disabled = loading;
        sendBtn.textContent = loading ? "..." : "\u27A4";
        statusEl.textContent = loading ? "Sending request to /api/posture-coach/chat..." : "Ready.";
      };

      window.addEventListener("error", (event) => {
        errorEl.textContent = "Client error: " + String(event?.message || "unknown error");
      });

      window.addEventListener("unhandledrejection", (event) => {
        errorEl.textContent = "Unhandled promise: " + String(event?.reason || "unknown rejection");
      });

      const fetchMobileEquivalentSnapshot = async () => {
        try {
          const response = await fetch("/sensorData", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            throw new Error("HTTP " + response.status + " from /sensorData");
          }

          const data = await response.json();
          const normalCount = clamp(data?.h || 0, 0, 100000000);
          const slouchyCount = clamp(data?.i || 0, 0, 100000000);
          const rightCount = clamp(data?.f || 0, 0, 100000000);
          const leftCount = clamp(data?.g || 0, 0, 100000000);

          const postureState = derivePostureState(normalCount, slouchyCount);
          const trend = deriveTrend(normalCount, slouchyCount);
          const slouchDurationSec = clamp(slouchyCount * 30, 0, 7200);
          const correctionsToday = clamp(slouchyCount + leftCount + rightCount, 0, 500);

          sensorStatusEl.textContent =
            "sensorData synced | postureState=" + postureState +
            " | trend=" + trend +
            " | slouchDurationSec=" + slouchDurationSec +
            " | correctionsToday=" + correctionsToday;

          return {
            postureState,
            trend,
            slouchDurationSec,
            correctionsToday,
          };
        } catch (error) {
          sensorStatusEl.textContent =
            "sensorData sync failed, fallback defaults | " +
            String(error && error.message ? error.message : error);

          return {
            postureState: "unknown",
            trend: "stable",
            slouchDurationSec: 0,
            correctionsToday: 0,
          };
        }
      };

      const buildMobileEquivalentPayload = async (text) => {
        const snapshot = await fetchMobileEquivalentSnapshot();

        // Match mobile logic: history is all prior messages excluding the latest user message.
        const history = messages
          .slice(0, Math.max(messages.length - 1, 0))
          .map((msg) => String(msg.text || ""))
          .filter((msg) => msg.trim().length > 0);

        return {
          userId: document.getElementById("userId").value.trim() || "mobile-user",
          message: text,
          postureState: snapshot.postureState,
          trend: snapshot.trend,
          slouchDurationSec: snapshot.slouchDurationSec,
          correctionsToday: snapshot.correctionsToday,
          discomfortLevel: 0,
          debugModelPayload: Boolean(document.getElementById("includeModelPayload")?.checked),
          history: history.length > 12 ? history.slice(history.length - 12) : history,
        };
      };

      const sendMessage = async (presetText) => {
        const text = String(presetText ?? messageInput.value ?? "").trim();
        if (!text || sendBtn.disabled) return;

        errorEl.textContent = "";
        messages.push({ sender: "user", text, options: [] });
        renderMessages();

        if (!presetText) {
          messageInput.value = "";
        }

        setLoading(true);

        try {
          modelRawEl.textContent = "";
          apiRawEl.textContent = "";
          const payload = await buildMobileEquivalentPayload(text);
          sentRawEl.textContent = JSON.stringify(payload, null, 2);

          const response = await fetch("/api/posture-coach/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const contentType = (response.headers.get("content-type") || "").toLowerCase();
          let data = null;

          if (contentType.includes("application/json")) {
            data = await response.json();
            apiRawEl.textContent = "API RESPONSE:\n" + JSON.stringify(data, null, 2);
          } else {
            const textBody = await response.text();
            apiRawEl.textContent = "NON-JSON RESPONSE:\n" + textBody;
            throw new Error("Expected JSON but received " + (contentType || "unknown") + ". " + textBody.slice(0, 120));
          }

          if (response.status !== 200) {
            messages.push({ sender: "coach", text: SERVER_UNAVAILABLE, options: [] });
            renderMessages();
            return;
          }

          if (data?.debug?.modelPayload) {
            const reason = data?.debug?.reason ? "\nreason: " + String(data.debug.reason) : "";
            modelRawEl.textContent = "MODEL PAYLOAD SENT TO AI:" + reason + "\n" + JSON.stringify(data.debug.modelPayload, null, 2);
          } else {
            modelRawEl.textContent =
              "Model payload debug not included in response.\n" +
              "Tip: ensure checkbox is checked, run from localhost, and review returned JSON below.\n\n" +
              JSON.stringify(data, null, 2);
          }

          const source = String(data?.source || "").toLowerCase();
          const coach = data?.coach && typeof data.coach === "object" ? data.coach : null;
          const reply = coach && typeof coach.reply === "string" ? coach.reply.trim() : "";
          const options = Array.isArray(coach?.options)
            ? coach.options.map((item) => String(item || "").trim()).filter(Boolean)
            : [];

          messages.push({
            sender: "coach",
            text: source === "unavailable" ? SERVER_UNAVAILABLE : (reply || SERVER_UNAVAILABLE),
            options,
          });
          renderMessages();
        } catch (error) {
          messages.push({ sender: "coach", text: SERVER_UNAVAILABLE, options: [] });
          renderMessages();
          apiRawEl.textContent = "REQUEST FAILED:\n" + String(error && error.message ? error.message : error);
          errorEl.textContent = String(error && error.message ? error.message : error);
        } finally {
          setLoading(false);
          renderMessages();
        }
      };

      sendBtn.addEventListener("click", () => sendMessage());
      messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendMessage();
        }
      });

      fetchMobileEquivalentSnapshot();
      renderMessages();
    </script>
  </body>
</html>`);
});

router.get("/api/posture-coach/health", (req, res) => {
  const aiConfig = resolveGroqConfig();
  const hasApiKey = Boolean(aiConfig.apiKey);
  res.status(200).json({
    ok: true,
    provider: aiConfig.provider,
    model: aiConfig.model,
    configured: hasApiKey,
  });
});

router.post("/api/posture-coach/chat", async (req, res) => {
  const debugRequested = req.query?.debugPayload === "1" || req.body?.debugModelPayload === true;
  const debugViaEnv = String(process.env.COACH_ALLOW_DEBUG_PAYLOAD || "").toLowerCase() === "1";
  const debugAllowed = process.env.NODE_ENV !== "production" || debugViaEnv || isLocalDebugRequest(req);
  const includeDebugModelPayload =
    debugRequested && debugAllowed;

  const userId = sanitizeText(req.body?.userId, 120) || DEFAULT_SINGLE_USER_ID;
  const ip = sanitizeText(req.ip, 64) || "unknown";
  const rateKey = `${userId}:${ip}`;

  const limitState = enforceRateLimit(rateKey);
  if (!limitState.allowed) {
    return res.status(429).json({
      error: "Too many requests",
      retryAfterSec: limitState.retryAfterSec,
    });
  }

  const message = sanitizeText(req.body?.message, MAX_MESSAGE_LENGTH);
  const postureState = sanitizeText(req.body?.postureState, 30) || "unknown";
  const trend = sanitizeText(req.body?.trend, 40) || "stable";
  const slouchDurationSec = clampNumber(req.body?.slouchDurationSec, 0, 7200);
  const correctionsToday = clampNumber(req.body?.correctionsToday, 0, 500);
  const discomfortLevel = clampNumber(req.body?.discomfortLevel, 0, 10);
  
  // UPDATED: Extract newly added specific hardware states from request
  const mpuAngle = clampNumber(req.body?.mpuAngle, -90, 90);
  const fsrPressure = clampNumber(req.body?.fsrPressure, 0, 1024);

  const hardwareState = {
    vibrationActive: Boolean(req.body?.vibrationActive),
    airChamberActive: Boolean(req.body?.airChamberActive),
    sensors: {
      mpuAngle,
      fsrPressure
    }
  };

  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-MAX_HISTORY_ITEMS).map((item) => sanitizeText(String(item), 200)).filter(Boolean)
    : [];
  const languageHint = detectLanguageHint(message || history[history.length - 1] || "");

  if (!message && !req.body?.postureState) {
    return res.status(400).json({
      error: "Validation error",
      details: "message or postureState is required",
    });
  }

  const emergencyText = `${message} ${trend}`.trim();

  if (isAskingAboutOmar(message)) {
    return res.status(200).json({
      source: "policy",
      coach: {
        messageType: "reinforcement",
        riskLevel: "low",
        deviceCommand: "none",
        reply: "اه ده برنس المشروع",
        suggestedAction: "اسألني أي حاجة تانية عن القعدة أو جهاز SitX.",
        options: [
          "اعمل لي تحليل سريع لآخر أسبوع",
          "إزاي أقلل الـ slouching؟",
          "هل أفعّل الـ air chamber؟",
        ],
      },
      medicalNotice: "This assistant supports posture wellness and education only, not diagnosis or treatment.",
      ...(includeDebugModelPayload ? {
        debug: {
          modelPayload: null,
          reason: "policy_short_circuit",
        },
      } : {}),
    });
  }

  if (hasEmergencyContent(emergencyText) || discomfortLevel >= 8) {
    return res.status(200).json({
      source: "safety",
      coach: {
        messageType: "safety",
        riskLevel: "high",
        deviceCommand: "deflate_chamber", 
        reply: "Your symptoms may need urgent care. Please contact local emergency services now, or seek immediate medical attention.",
        suggestedAction: "Stop the session, take off the jacket, and get urgent medical help now.",
      },
      medicalNotice: "This assistant is not a medical professional and cannot diagnose conditions.",
      ...(includeDebugModelPayload ? {
        debug: {
          modelPayload: null,
          reason: "safety_short_circuit",
        },
      } : {}),
    });
  }

  let aggregatedContext = { hasData: false, source: null, generatedAt: null, metrics: {} };

  try {
    aggregatedContext = await fetchAggregatedContext(req);
  } catch (error) {
    console.error("Failed to fetch aggregated context:", error.message);
  }

  const aggregatedMetrics = sanitizeAggregatedMetrics(aggregatedContext.metrics);
  const readingsSummary = summarizeReadingsFromAggregated(aggregatedMetrics);

  const payload = {
    userId,
    postureState,
    trend,
    slouchDurationSec,
    correctionsToday,
    discomfortLevel,
    message,
    hardwareState, 
    languageHint,
    history,
    aggregatedSensorContext: {
      hasData: aggregatedContext.hasData,
      source: aggregatedContext.source,
      generatedAt: aggregatedContext.generatedAt,
      metrics: aggregatedMetrics,
    },
    sensorReadingsSummary: readingsSummary,
    aggregatedCoachingContext: buildCoachReadyAggregatedContext({
      aggregatedMetrics,
      summary: readingsSummary,
    }),
    sensorInterpretationGuide: buildSensorInterpretationGuide({
      summary: readingsSummary,
      aggregatedContext,
    }),
    objective: "coach user on safer daily posture habits using the SitX smart jacket features",
  };

  const aiConfig = resolveGroqConfig();

  if (!aiConfig.apiKey) {
    console.error(`API Error: Missing ${aiConfig.provider} API Key`);
    return res.status(503).json({
      error: "AI_UNAVAILABLE",
      details: `The SitX posture coach is not configured on the server (${aiConfig.provider} key missing).`,
      ...(includeDebugModelPayload ? {
        debug: {
          modelPayload: payload,
          reason: "missing_ai_key",
        },
      } : {}),
    });
  }

  try {
    const modelResponse = await generateCoachReply(aiConfig, payload);
    const coach = sanitizeModelResponse(modelResponse);

    const combinedText = `${coach.reply} ${coach.suggestedAction}`.toLowerCase();
    if (hasEmergencyContent(combinedText)) {
      coach.messageType = "safety";
      coach.riskLevel = "high";
      coach.deviceCommand = "deflate_chamber";
      coach.reply = "I cannot provide emergency medical guidance. Please seek urgent in-person care or call emergency services now.";
      coach.suggestedAction = "Stop the session and take off the jacket if symptoms are severe.";
    }

    return res.status(200).json({
      source: aiConfig.provider,
      model: aiConfig.model,
      coach,
      medicalNotice: "This assistant supports posture wellness and education only, not diagnosis or treatment.",
      ...(includeDebugModelPayload ? {
        debug: {
          modelPayload: payload,
        },
      } : {}),
    });

  } catch (error) {
    console.error("Posture coach generation failed:", error.message);
    return res.status(503).json({
      error: "AI_UNAVAILABLE",
      details: "The AI service is temporarily offline or unreachable.",
      ...(includeDebugModelPayload ? {
        debug: {
          modelPayload: payload,
          reason: "ai_request_failed",
        },
      } : {}),
    });
  }
});

export default router;