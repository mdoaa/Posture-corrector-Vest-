import express from "express";

const router = express.Router();

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const MAX_MESSAGE_LENGTH = 700;
const MAX_HISTORY_ITEMS = 12;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_COUNT = 20;

const requestBuckets = new Map();

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "faint",
  "fainted",
  "numb",
  "numbness",
  "can not breathe",
  "can't breathe",
  "difficulty breathing",
  "severe pain",
  "emergency",
  "suicidal",
  "self harm",
  "self-harm",
];

const COACH_SYSTEM_PROMPT = [
  "You are SitGuard Coach, a posture-support assistant for wellness and ergonomics.",
  "Follow medical safety standards:",
  "1) Never diagnose medical conditions.",
  "2) Never prescribe medication or treatment plans.",
  "3) Never claim certainty about injuries.",
  "4) If symptoms look urgent, advise immediate medical attention.",
  "5) Keep guidance low-risk, supportive, and practical.",
  "6) Recommend professional evaluation for persistent or worsening pain.",
  "7) Do not shame or alarm users.",
  "Answer in short plain language suitable for mobile chat.",
  "Return JSON only with this schema:",
  '{"messageType":"alert|action|reinforcement|insight|safety","reply":"string","suggestedAction":"string","riskLevel":"low|medium|high"}',
].join("\n");

const MODEL_UNAVAILABLE_RESPONSE = {
  messageType: "alert",
  riskLevel: "low",
  reply: "Posture coach is temporarily unavailable. Please try again later.",
  suggestedAction: "Try again in a few minutes.",
};

const clampNumber = (value, min, max, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
};

const sanitizeText = (value, maxLength = MAX_MESSAGE_LENGTH) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
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

const parseGeminiJson = (text) => {
  const direct = text.trim();

  try {
    return JSON.parse(direct);
  } catch {
    const match = direct.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const sanitizeModelResponse = (value, fallback) => {
  const validTypes = new Set(["alert", "action", "reinforcement", "insight", "safety"]);
  const validRisk = new Set(["low", "medium", "high"]);

  const messageType = sanitizeText(value?.messageType, 20).toLowerCase();
  const riskLevel = sanitizeText(value?.riskLevel, 10).toLowerCase();
  const reply = sanitizeText(value?.reply, 500);
  const suggestedAction = sanitizeText(value?.suggestedAction, 220);

  return {
    messageType: validTypes.has(messageType) ? messageType : fallback.messageType,
    riskLevel: validRisk.has(riskLevel) ? riskLevel : fallback.riskLevel,
    reply: reply || fallback.reply,
    suggestedAction: suggestedAction || fallback.suggestedAction,
  };
};

const buildFallbackCoach = (payload) => {
  const postureState = sanitizeText(payload?.postureState, 30).toLowerCase();
  const trend = sanitizeText(payload?.trend, 40).toLowerCase();
  const slouchDurationSec = clampNumber(payload?.slouchDurationSec, 0, 7200);
  const correctionsToday = clampNumber(payload?.correctionsToday, 0, 500);
  const discomfortLevel = clampNumber(payload?.discomfortLevel, 0, 10);
  const message = sanitizeText(payload?.message, 240).toLowerCase();

  if (discomfortLevel >= 7) {
    return {
      messageType: "safety",
      riskLevel: "medium",
      reply:
        "Your discomfort sounds significant. Stop and rest now, and avoid forcing posture corrections.",
      suggestedAction:
        "Take a 10-minute break, use gentle movement only, and seek medical advice if pain persists.",
    };
  }

  const isSlouching = postureState === "slouching" || message.includes("slouch");
  const isWorsening = trend === "worsening";
  const longSlouch = slouchDurationSec >= 1800;
  const manyCorrections = correctionsToday >= 15;

  if (isSlouching && isWorsening) {
    return {
      messageType: "action",
      riskLevel: "low",
      reply:
        "You are trending toward more slouching. Reset now: feet flat, hips back in the chair, shoulders relaxed, and screen at eye level.",
      suggestedAction:
        "Use a 25-5 cycle: every 25 minutes sit tall, then take a 2-5 minute stand-and-stretch break.",
    };
  }

  if (isSlouching || longSlouch) {
    return {
      messageType: "insight",
      riskLevel: "low",
      reply:
        "A long slouch period can overload your neck and lower back. Small frequent posture resets work better than one big correction.",
      suggestedAction:
        "Set a reminder every 20-30 minutes: chin tucked, ribs stacked over hips, and both feet grounded.",
    };
  }

  if (manyCorrections) {
    return {
      messageType: "reinforcement",
      riskLevel: "low",
      reply:
        "Great effort today. High correction count means you are building awareness, which is the first step to better posture habits.",
      suggestedAction:
        "Keep the same routine and add one short chest-opening stretch after each study block.",
    };
  }

  return {
    messageType: "reinforcement",
    riskLevel: "low",
    reply:
      "Your posture status looks relatively stable. Keep movements regular and avoid staying in one position for too long.",
    suggestedAction:
      "Do one 60-second reset now: stand up, roll shoulders back, and take 5 deep breaths.",
  };
};

const generateCoachReply = async (apiKey, payload) => {
  const model = sanitizeText(process.env.GEMINI_MODEL, 80) || DEFAULT_MODEL;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: COACH_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify(payload),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 320,
      responseMimeType: "application/json",
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${responseText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini response did not include text content");
  }

  const parsed = parseGeminiJson(text);
  if (!parsed) {
    throw new Error("Gemini response was not valid JSON");
  }

  return parsed;
};

router.get("/api/posture-coach/health", (req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  res.status(200).json({
    ok: true,
    provider: "gemini",
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    configured: hasApiKey,
  });
});

router.post("/api/posture-coach/chat", async (req, res) => {
  const userId = sanitizeText(req.body?.userId, 80) || "anonymous";
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
        reply:
          "Your symptoms may need urgent care. Please contact local emergency services now, or seek immediate medical attention.",
        suggestedAction: "Stop the session and get urgent medical help now.",
      },
      medicalNotice:
        "This assistant is not a medical professional and cannot diagnose conditions.",
    });
  }

  const payload = {
    postureState,
    trend,
    slouchDurationSec,
    correctionsToday,
    discomfortLevel,
    message,
    history,
    objective: "coach user on safer daily posture habits",
  };

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const fallbackCoach = buildFallbackCoach(payload);
    return res.status(200).json({
      source: "fallback",
      coach: fallbackCoach,
      medicalNotice:
        "This assistant supports posture wellness only and does not provide medical diagnosis.",
    });
  }

  try {
    const modelResponse = await generateCoachReply(apiKey, payload);
    const coach = sanitizeModelResponse(modelResponse, MODEL_UNAVAILABLE_RESPONSE);

    const combinedText = `${coach.reply} ${coach.suggestedAction}`.toLowerCase();
    if (hasEmergencyContent(combinedText)) {
      coach.messageType = "safety";
      coach.riskLevel = "high";
      coach.reply =
        "I cannot provide emergency medical guidance. Please seek urgent in-person care or call emergency services now.";
      coach.suggestedAction = "Stop and contact emergency services if symptoms are severe.";
    }

    return res.status(200).json({
      source: "gemini",
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      coach,
      medicalNotice:
        "This assistant supports posture wellness and education only, not diagnosis or treatment.",
    });
  } catch (error) {
    console.error("Posture coach generation failed:", error.message);
    const fallbackCoach = buildFallbackCoach(payload);
    return res.status(200).json({
      source: "fallback",
      coach: fallbackCoach,
      medicalNotice:
        "This assistant supports posture wellness only and does not provide medical diagnosis.",
    });
  }
});

export default router;
