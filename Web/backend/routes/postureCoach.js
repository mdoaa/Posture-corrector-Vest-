import express from "express";
import SitxHistory from "../models/sensorHistory.js";

const router = express.Router();

const AI_PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();
const DEFAULT_XAI_MODEL = process.env.XAI_MODEL || "grok-4-1-fast";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const MAX_MESSAGE_LENGTH = 700;
const MAX_HISTORY_ITEMS = 12;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_COUNT = 20;

const requestBuckets = new Map();
const DEFAULT_SINGLE_USER_ID = "vest-single-user";

const counter = (record, key) => Number(record?.[key] || 0);

const safePct = (num, den) => {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) {
    return 0;
  }
  return Number(((num / den) * 100).toFixed(2));
};

const buildSingleVestHistoryContext = async () => {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [latest, baseline7, baseline30, firstRecord, totalRecords] = await Promise.all([
    SitxHistory.findOne().sort({ receivedAt: -1 }).lean(),
    SitxHistory.findOne({ receivedAt: { $lt: sevenDaysAgo } }).sort({ receivedAt: -1 }).lean(),
    SitxHistory.findOne({ receivedAt: { $lt: thirtyDaysAgo } }).sort({ receivedAt: -1 }).lean(),
    SitxHistory.findOne().sort({ receivedAt: 1 }).lean(),
    SitxHistory.countDocuments(),
  ]);

  if (!latest) {
    return { hasData: false, totalRecords: 0 };
  }

  const delta = (key, baseline) => Math.max(0, counter(latest, key) - counter(baseline, key));

  const slouch7 = delta("i", baseline7);
  const normal7 = delta("h", baseline7);
  const left7 = delta("g", baseline7);
  const right7 = delta("f", baseline7);
  const postureEvents7 = slouch7 + normal7 + left7 + right7;

  const slouch30 = delta("i", baseline30);
  const normal30 = delta("h", baseline30);
  const left30 = delta("g", baseline30);
  const right30 = delta("f", baseline30);
  const postureEvents30 = slouch30 + normal30 + left30 + right30;

  return {
    hasData: true,
    totalRecords,
    latestAt: latest.receivedAt || null,
    sevenDay: {
      slouch: slouch7,
      normal: normal7,
      left: left7,
      right: right7,
      totalPostureEvents: postureEvents7,
      slouchPercent: safePct(slouch7, postureEvents7),
    },
    thirtyDay: {
      slouch: slouch30,
      normal: normal30,
      left: left30,
      right: right30,
      totalPostureEvents: postureEvents30,
      slouchPercent: safePct(slouch30, postureEvents30),
    },
    allTime: {
      slouch: delta("i", firstRecord),
      normal: delta("h", firstRecord),
      left: delta("g", firstRecord),
      right: delta("f", firstRecord),
      airChamber: delta("j", firstRecord),
    },
  };
};

const EMERGENCY_KEYWORDS = [
  "chest pain", "faint", "fainted", "numb", "numbness",
  "can not breathe", "can't breathe", "difficulty breathing",
  "severe pain", "emergency", "suicidal", "self harm", "self-harm",
];

// Updated System Prompt with Hardware Awareness
const COACH_SYSTEM_PROMPT = [
  "You are SitGuard Coach, a posture-support AI integrated directly into a smart ergonomic jacket.",
  "Follow medical safety standards:",
  "1) Never diagnose medical conditions.",
  "2) Never prescribe medication or treatment plans.",
  "3) Never claim certainty about injuries.",
  "4) If symptoms look urgent, advise immediate medical attention.",
  "5) Keep guidance low-risk, supportive, and practical.",
  "6) Recommend professional evaluation for persistent or worsening pain.",
  "7) Do not shame or alarm users.",
  "8) The user is wearing a jacket with controllable Air Chambers (lumbar support) and Vibration motors (haptic feedback).",
  "9) If the user is slouching, you can suggest they turn on vibration reminders or inflate the air chamber.",
  "10) If they complain of pressure or stiffness, suggest deflating the air chamber.",
  "Answer in short plain language suitable for mobile chat.",
  "Return JSON only with this exact schema:",
  '{"messageType":"alert|action|reinforcement|insight|safety","reply":"string","suggestedAction":"string","riskLevel":"low|medium|high", "deviceCommand":"none|inflate_chamber|deflate_chamber|enable_vibration|disable_vibration"}'
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

// Updated Sanitizer without Fallbacks
const sanitizeModelResponse = (value) => {
  const validTypes = new Set(["alert", "action", "reinforcement", "insight", "safety"]);
  const validRisk = new Set(["low", "medium", "high"]);
  const validCommands = new Set(["none", "inflate_chamber", "deflate_chamber", "enable_vibration", "disable_vibration"]);

  const messageType = sanitizeText(value?.messageType, 20).toLowerCase();
  const riskLevel = sanitizeText(value?.riskLevel, 10).toLowerCase();
  const deviceCommand = sanitizeText(value?.deviceCommand, 25).toLowerCase();

  return {
    messageType: validTypes.has(messageType) ? messageType : "insight",
    riskLevel: validRisk.has(riskLevel) ? riskLevel : "low",
    deviceCommand: validCommands.has(deviceCommand) ? deviceCommand : "none",
    reply: sanitizeText(value?.reply, 500) || "Keep up the focus on your posture.",
    suggestedAction: sanitizeText(value?.suggestedAction, 220) || "Adjust your position if needed.",
  };
};

const resolveAiConfig = () => {
  if (AI_PROVIDER === "groq") {
    return {
      provider: "groq",
      apiKey: sanitizeText(process.env.GROQ_API_KEY, 400),
      model: sanitizeText(process.env.GROQ_MODEL, 120) || DEFAULT_GROQ_MODEL,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
    };
  }

  return {
    provider: "xai",
    apiKey: sanitizeText(process.env.XAI_API_KEY, 400),
    model: sanitizeText(process.env.XAI_MODEL, 120) || DEFAULT_XAI_MODEL,
    endpoint: "https://api.x.ai/v1/chat/completions",
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

  if (!text) throw new Error("xAI response did not include text content");

  const parsed = parseModelJson(text);
  if (!parsed) throw new Error("xAI response was not valid JSON");

  return parsed;
};

router.get("/api/posture-coach/health", (req, res) => {
  const aiConfig = resolveAiConfig();
  const hasApiKey = Boolean(aiConfig.apiKey);
  res.status(200).json({
    ok: true,
    provider: aiConfig.provider,
    model: aiConfig.model,
    configured: hasApiKey,
  });
});

router.post("/api/posture-coach/chat", async (req, res) => {
  const userId = DEFAULT_SINGLE_USER_ID;
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

  // Extract Hardware State from incoming request
  const hardwareState = {
    vibrationActive: Boolean(req.body?.vibrationActive),
    airChamberActive: Boolean(req.body?.airChamberActive)
  };

  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-MAX_HISTORY_ITEMS).map((item) => sanitizeText(String(item), 200)).filter(Boolean)
    : [];

  if (!message && !req.body?.postureState) {
    return res.status(400).json({
      error: "Validation error",
      details: "message or postureState is required",
    });
  }

  const emergencyText = `${message} ${trend}`.trim();
  if (hasEmergencyContent(emergencyText) || discomfortLevel >= 8) {
    return res.status(200).json({
      source: "safety",
      coach: {
        messageType: "safety",
        riskLevel: "high",
        deviceCommand: "deflate_chamber", // Deflate chamber to relieve pressure in an emergency
        reply: "Your symptoms may need urgent care. Please contact local emergency services now, or seek immediate medical attention.",
        suggestedAction: "Stop the session and get urgent medical help now.",
      },
      medicalNotice: "This assistant is not a medical professional and cannot diagnose conditions.",
    });
  }

  let historyContext = { hasData: false, totalRecords: 0 };
  try {
    historyContext = await buildSingleVestHistoryContext();
  } catch (error) {
    console.error("Failed to build vest history context:", error.message);
  }

  const payload = {
    userId,
    postureState,
    trend,
    slouchDurationSec,
    correctionsToday,
    discomfortLevel,
    message,
    hardwareState, // Injecting hardware context for the AI
    history,
    vestHistoryContext: historyContext,
    objective: "coach user on safer daily posture habits using the smart jacket features",
  };

  const aiConfig = resolveAiConfig();

  // No API Key? Return an HTTP 503 instead of a fallback text.
  if (!aiConfig.apiKey) {
    console.error(`API Error: Missing ${aiConfig.provider} API Key`);
    return res.status(503).json({
      error: "AI_UNAVAILABLE",
      details: `The posture coach is not configured on the server (${aiConfig.provider} key missing).`
    });
  }

  try {
    const modelResponse = await generateCoachReply(aiConfig, payload);
    const coach = sanitizeModelResponse(modelResponse);

    // Final safety check on AI output
    const combinedText = `${coach.reply} ${coach.suggestedAction}`.toLowerCase();
    if (hasEmergencyContent(combinedText)) {
      coach.messageType = "safety";
      coach.riskLevel = "high";
      coach.deviceCommand = "deflate_chamber";
      coach.reply = "I cannot provide emergency medical guidance. Please seek urgent in-person care or call emergency services now.";
      coach.suggestedAction = "Stop and contact emergency services if symptoms are severe.";
    }

    return res.status(200).json({
      source: aiConfig.provider,
      model: aiConfig.model,
      coach,
      medicalNotice: "This assistant supports posture wellness and education only, not diagnosis or treatment.",
    });

  } catch (error) {
    // API Failed or Timeout? Return HTTP 503 instead of a fallback text.
    console.error("Posture coach generation failed:", error.message);
    return res.status(503).json({
      error: "AI_UNAVAILABLE",
      details: "The AI service is temporarily offline or unreachable."
    });
  }
});

export default router;