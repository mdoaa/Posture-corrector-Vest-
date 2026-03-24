import express from "express";

const router = express.Router();

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MAX_MESSAGE_LENGTH = 700;
const MAX_HISTORY_ITEMS = 12;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_COUNT = 20;
const AGGREGATED_FETCH_TIMEOUT_MS = 4500;

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

const fetchAggregatedContext = async (req) => {
  const origin = getRequestOrigin(req);
  const envBase = sanitizeText(process.env.PUBLIC_BASE_URL, 300);
  const candidates = [
    origin ? `${origin}/sensor/aggregated` : "",
    origin ? `${origin}/sensorHistory/aggregated` : "",
    envBase ? `${envBase}/sensor/aggregated` : "",
    envBase ? `${envBase}/sensorHistory/aggregated` : "",
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

const EMERGENCY_KEYWORDS = [
  "chest pain", "faint", "fainted", "numb", "numbness",
  "can not breathe", "can't breathe", "difficulty breathing",
  "severe pain", "emergency", "suicidal", "self harm", "self-harm",
];

// Updated System Prompt with Hardware Awareness
const COACH_SYSTEM_PROMPT = [
  "You are SitGuard Coach, a posture-support AI integrated directly into a smart ergonomic jacket.",
  "Be natural and conversational. Keep it short, friendly, and useful.",
  "Always reply in the same language as the user's latest message.",
  "If the user asks what to do next, offer 2-4 clear options they can choose from.",
  "If you are not sure, do not guess and do not invent facts.",
  "When uncertain about medical meaning, clearly say you are not sure and advise seeing a doctor.",
  "If the user asks about Omar (for example: 'تعرف عمر؟' or 'Do you know Omar?'), reply exactly: 'اه ده برنس المشروع'.",
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
  "Use aggregated metrics context when available (today/week/twoWeeks/month/sixMonths/year).",
  "Return JSON only with this schema:",
  '{"messageType":"alert|action|reinforcement|insight|safety","reply":"string","suggestedAction":"string","riskLevel":"low|medium|high", "deviceCommand":"none|inflate_chamber|deflate_chamber|enable_vibration|disable_vibration", "options":["string"]}'
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

// Updated Sanitizer without Fallbacks
const sanitizeModelResponse = (value) => {
  const validTypes = new Set(["alert", "action", "reinforcement", "insight", "safety"]);
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

  // Extract Hardware State from incoming request
  const hardwareState = {
    vibrationActive: Boolean(req.body?.vibrationActive),
    airChamberActive: Boolean(req.body?.airChamberActive)
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
        suggestedAction: "اسألني أي حاجة تانية عن القعدة أو الجهاز.",
        options: [
          "اعمل لي تحليل سريع لآخر أسبوع",
          "إزاي أقلل الـ slouching؟",
          "هل أفعّل vibration ولا air chamber؟",
        ],
      },
      medicalNotice: "This assistant supports posture wellness and education only, not diagnosis or treatment.",
    });
  }

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

  let aggregatedContext = { hasData: false, source: null, generatedAt: null, metrics: {} };

  try {
    aggregatedContext = await fetchAggregatedContext(req);
  } catch (error) {
    console.error("Failed to fetch aggregated context:", error.message);
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
    languageHint,
    history,
    aggregatedSensorContext: aggregatedContext,
    objective: "coach user on safer daily posture habits using the smart jacket features",
  };

  const aiConfig = resolveGroqConfig();

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