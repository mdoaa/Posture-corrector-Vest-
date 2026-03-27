import express from "express";

const router = express.Router();

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MAX_MESSAGE_LENGTH = 700;
const MAX_HISTORY_ITEMS = 12;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_COUNT = 20;
const AGGREGATED_FETCH_TIMEOUT_MS = 4500;
const AGGREGATED_WINDOW_SEQUENCE = [
  { key: "today", days: 1 },
  { key: "week", days: 7 },
  { key: "twoWeeks", days: 14 },
  { key: "month", days: 30 },
  { key: "sixMonths", days: 180 },
  { key: "year", days: 365 },
];

const requestBuckets = new Map();
const DEFAULT_SINGLE_USER_ID = "mobile-user";

const detectLanguageHint = (text) => {
  const input = String(text || "").trim();
  if (!input) return "same-as-user";
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
      // Try next
    }
  }

  return { hasData: false, source: null, generatedAt: null, metrics: {} };
};

const clampNumber = (value, min, max, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};

const sanitizeText = (value, maxLength = MAX_MESSAGE_LENGTH) => {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
};

const sanitizeWindowMetrics = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    days: clampNumber(source.days, 0, 3650),
    recordsInRange: clampNumber(source.recordsInRange, 0, 10_000_000),
    normalCount: clampNumber(source.normalCount, 0, 10_000_000),
    slouchyCount: clampNumber(source.slouchyCount, 0, 10_000_000),
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

const summarizeReadingsFromAggregated = (aggregatedMetrics) => {
  const windows = AGGREGATED_WINDOW_SEQUENCE.map((windowDef) => ({
    key: windowDef.key,
    days: windowDef.days,
    metrics: sanitizeWindowMetrics(aggregatedMetrics?.[windowDef.key]),
  })).filter((item) => item.metrics.recordsInRange > 0);

  if (windows.length === 0) {
    return { inferredTrend: "stable", insight: "No historical data available." };
  }

  let totalNormal = 0;
  let totalSlouchy = 0;
  for (const w of windows) {
    totalNormal += w.metrics.normalCount;
    totalSlouchy += w.metrics.slouchyCount;
  }

  let trend = "stable";
  if (totalSlouchy > totalNormal) trend = "worsening";
  else if (totalNormal > totalSlouchy) trend = "improving";

  const totalEvents = totalNormal + totalSlouchy;
  const normalSharePct = totalEvents > 0 ? Math.round((totalNormal / totalEvents) * 100) : 0;
  const slouchySharePct = totalEvents > 0 ? Math.round((totalSlouchy / totalEvents) * 100) : 0;

  return {
    inferredTrend: trend,
    insight: `Overall, normal posture represents ${normalSharePct}% of recent activity compared to ${slouchySharePct}% slouching.`,
  };
};

const EMERGENCY_KEYWORDS = [
  "chest pain", "faint", "fainted", "numb", "numbness",
  "can not breathe", "can't breathe", "difficulty breathing",
  "severe pain", "emergency", "suicidal", "self harm", "self-harm",
];

// UPDATED AI PROMPT: Tailored to read the new Clean Payload
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
  "- reply: A warm, natural, friendly response",
  "- suggestedAction: Optional friendly question or encouragement",
  "- deviceCommand: 'none'",
  "- options: Empty array or optional follow-up conversation starters",
  "",
  "WHEN USER ASKS ABOUT POSTURE, HEALTH, COMFORT, OR DEVICE:",
  "- messageType: One of 'alert', 'action', 'reinforcement', 'insight', 'safety'",
  "- riskLevel: 'low', 'medium', or 'high'",
  "- reply: Specialized coaching advice based on the provided payload.",
  "- suggestedAction: Specific next step (e.g., 'Inflate the air chamber', 'Take a stretch break')",
  "- deviceCommand: Recommend device action if relevant ('inflate_chamber', 'deflate_chamber', 'enable_vibration', etc.)",
  "- options: 2-4 suggested follow-up actions",
  "",
  "MEDICAL SAFETY RULES:",
  "- Never diagnose, prescribe, or claim certainty about medical conditions.",
  "- If symptoms suggest emergency, reply with messageType 'safety' and advise immediate medical attention.",
  "",
  "DEVICE CONTEXT & DATA (CRITICAL):",
  "- You will receive a structured JSON payload containing 'currentState', 'hardwareState', 'aiCoachingDirectives', and 'historicalData_ActiveWindowsOnly'.",
  "- Use 'currentState' to understand the user's immediate situation.",
  "- Read 'aiCoachingDirectives' for specific rules on how to interpret the data and guide the user.",
  "- Use 'historicalData_ActiveWindowsOnly' ONLY when answering questions about past performance.",
  "- Do not just repeat raw numbers; explain what the patterns mean in simple, friendly words.",
  "",
  "SPECIAL CASE: If asked about Omar, reply: 'اه ده برنس المشروع'",
  "",
  "JSON SCHEMA (ALWAYS use this structure):",
  '{"messageType":"greeting|alert|action|reinforcement|insight|safety","reply":"string","suggestedAction":"string","riskLevel":"low|medium|high","deviceCommand":"none|inflate_chamber|deflate_chamber|enable_vibration|disable_vibration","options":["string1","string2"]}'
].join("\n");

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
    ? value.options.map((item) => sanitizeText(String(item), 100)).filter(Boolean).slice(0, 4)
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

// ============================================================================
// THE LAB UI (Safe Boot, CSP Bypass, Simulator Controls)
// ============================================================================
router.get("/posture-coach-lab", (req, res) => {
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Content-Security-Policy");
  
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
        --bg1: #f8f9ff; --bg2: #edf2ff; --surface: #ffffff;
        --text: #1d2433; --muted: #607086;
        --userBubble: #7692ad; --coachBubble: #ffffff;
        --border: #d8e0eb; --chip: #f0f4fb; --chipBorder: #c9d4e3;
        --send: #3e6e9a; --sendDisabled: #a8b7c6; --danger: #b00020;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        color: var(--text); background: linear-gradient(165deg, var(--bg1), var(--bg2));
        display: grid; place-items: center; padding: 14px;
      }
      .phone {
        width: min(480px, 100%); height: min(900px, 95vh);
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 24px; overflow: hidden;
        box-shadow: 0 24px 60px rgba(35, 52, 84, 0.2);
        display: flex; flex-direction: column;
      }
      .top {
        padding: 14px 14px 10px; border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, #f7f9fd 0%, #ffffff 100%);
      }
      .title { font-size: 16px; font-weight: 700; margin: 0; }
      .subtitle { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
      
      .sim-panel { margin-top: 10px; font-size: 12px; background: #f0f4fb; border-radius: 8px; padding: 8px; border: 1px solid var(--border); }
      .sim-panel summary { font-weight: bold; cursor: pointer; color: #3e6e9a; outline: none; margin-bottom: 8px; }
      .sim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .sim-grid label { display: flex; flex-direction: column; color: var(--muted); font-size: 11px; }
      .sim-grid input, .sim-grid select { border: 1px solid var(--border); border-radius: 6px; padding: 4px 6px; font-size: 12px; }
      .sim-grid .checkbox-label { flex-direction: row; align-items: center; gap: 4px; margin-top: 10px; color: var(--text); }

      .metaRow { margin-top: 10px; display: grid; grid-template-columns: 1fr; gap: 8px; }
      .toggle { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
      .metaRow input.user-input { width: 100%; border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; font: inherit; }
      .status { margin-top: 6px; color: var(--muted); font-size: 12px; }
      
      .chatList { flex: 1; overflow: auto; padding: 12px; background: #f7f9fc; }
      .bubbleWrap { display: flex; margin-bottom: 10px; }
      .bubbleWrap.user { justify-content: flex-end; }
      .bubbleWrap.coach { justify-content: flex-start; }
      .bubble {
        max-width: 78%; border-radius: 14px; padding: 10px 12px;
        font-size: 14px; line-height: 1.35; box-shadow: 0 3px 8px rgba(18, 35, 62, 0.08);
        white-space: pre-wrap; word-break: break-word;
      }
      .bubbleWrap.user .bubble { background: var(--userBubble); color: #ffffff; }
      .bubbleWrap.coach .bubble { background: var(--coachBubble); border: 1px solid var(--border); }
      .chips { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        border: 1px solid var(--chipBorder); background: var(--chip);
        border-radius: 999px; padding: 6px 10px; font-size: 12px; cursor: pointer;
      }
      .chip:disabled { opacity: 0.65; cursor: default; }
      .bottom { border-top: 1px solid var(--border); background: #fff; padding: 10px 12px 12px; }
      .composer { display: flex; gap: 8px; }
      textarea {
        flex: 1; resize: none; min-height: 42px; max-height: 110px;
        border: 1px solid var(--border); border-radius: 12px; padding: 10px 11px; font: inherit;
      }
      textarea:focus, input:focus { outline: none; border-color: #8aa7c3; box-shadow: 0 0 0 3px rgba(103, 136, 168, 0.14); }
      button.send {
        width: 48px; height: 48px; border: 0; border-radius: 12px; color: #fff;
        background: var(--send); font-size: 18px; cursor: pointer;
      }
      button.send:disabled { background: var(--sendDisabled); cursor: default; }
      .err { margin-top: 6px; color: var(--danger); font-size: 12px; min-height: 16px; font-weight: bold; }
      .debug { margin-top: 8px; border-top: 1px dashed var(--border); padding-top: 8px; }
      .debug details { font-size: 12px; color: var(--muted); }
      .debug pre {
        margin: 8px 0 0; padding: 8px; border: 1px solid var(--border);
        border-radius: 8px; background: #fbfcff; color: #2b3645; overflow: auto;
        max-height: 180px; white-space: pre-wrap; word-break: break-word;
      }
    </style>
  </head>
  <body>
    <noscript>
      <div style="background: red; color: white; padding: 14px; text-align: center; font-weight: bold;">
        ERROR: JavaScript is blocked!
      </div>
    </noscript>
    <div class="phone">
      <div class="top">
        <h1 class="title">SitX Coach Lab</h1>
        <p class="subtitle">Mobile UI. Build: ${labBuildTag}</p>
        
        <div class="metaRow">
          <input id="userId" class="user-input" value="mobile-user" placeholder="userId" />
        </div>

        <details class="sim-panel">
          <summary>🔧 Simulator Controls (Overrides /sensorData)</summary>
          <div class="sim-grid">
            <label>Posture State
              <select id="simPosture">
                <option value="unknown">unknown</option>
                <option value="good" selected>good</option>
                <option value="slouching">slouching</option>
              </select>
            </label>
            <label>Trend
              <select id="simTrend">
                <option value="stable" selected>stable</option>
                <option value="worsening">worsening</option>
                <option value="improving">improving</option>
              </select>
            </label>
            <label>MPU Angle (deg)<input id="simMpu" type="number" value="15" /></label>
            <label>FSR Pressure<input id="simFsr" type="number" value="450" /></label>
            <label>Slouch Duration (s)<input id="simSlouchSec" type="number" value="0" /></label>
            <label>Corrections Today<input id="simCorrections" type="number" value="0" /></label>
            <label class="checkbox-label"><input id="simVib" type="checkbox" /> App Vibration</label>
            <label class="checkbox-label"><input id="simAir" type="checkbox" /> Air Chamber</label>
          </div>
        </details>

        <div class="metaRow">
          <label class="toggle">
            <input id="includeModelPayload" type="checkbox" checked /> Debug AI Payload
          </label>
        </div>
        
        <div class="status" id="status">Ready.</div>
        <div class="status" id="sensorStatus">sensorData: Fetching initial values...</div>
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
      document.addEventListener("DOMContentLoaded", () => {
        try {
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
          const messages = [{ sender: "coach", text: "Hi, I am your SitX posture coach. Ask me about your sitting habits.", options: [] }];

          const clamp = (value, min, max) => {
            const number = Number(value);
            return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
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

          const scrollToBottom = () => requestAnimationFrame(() => { 
            if(chatList) chatList.scrollTop = chatList.scrollHeight; 
          });

          const renderMessages = () => {
            if (!chatList) return;
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
                  chip.disabled = sendBtn ? sendBtn.disabled : false;
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
            if (sendBtn) {
              sendBtn.disabled = loading;
              sendBtn.textContent = loading ? "..." : "\\u27A4";
            }
            if (statusEl) statusEl.textContent = loading ? "Sending request..." : "Ready.";
          };

          window.addEventListener("error", (e) => {
            if(errorEl) errorEl.textContent = "Window Error: " + String(e?.message);
          });
          window.addEventListener("unhandledrejection", (e) => {
            if(errorEl) errorEl.textContent = "Promise Error: " + String(e?.reason);
          });

          const fetchInitialSensorData = async () => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3500);
              
              const response = await fetch("/sensorData", { 
                headers: { "Content-Type": "application/json" },
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              if (response.ok) {
                const data = await response.json();
                const doc = Array.isArray(data) ? data[0] : data;
                if (!doc) throw new Error("Received empty data object");

                const normalCount = clamp(doc?.h || 0, 0, 100000000);
                const slouchyCount = clamp(doc?.i || 0, 0, 100000000);
                const rightCount = clamp(doc?.f || 0, 0, 100000000);
                const leftCount = clamp(doc?.g || 0, 0, 100000000);

                document.getElementById("simPosture").value = derivePostureState(normalCount, slouchyCount);
                document.getElementById("simTrend").value = deriveTrend(normalCount, slouchyCount);
                document.getElementById("simSlouchSec").value = clamp(slouchyCount * 30, 0, 7200);
                document.getElementById("simCorrections").value = clamp(slouchyCount + leftCount + rightCount, 0, 500);
                
                if(sensorStatusEl) sensorStatusEl.textContent = "Initial sensor data loaded into Simulator panel.";
              } else {
                if(sensorStatusEl) sensorStatusEl.textContent = "Live /sensorData unavailable. Using defaults.";
              }
            } catch (error) {
              if(sensorStatusEl) sensorStatusEl.textContent = "Live /sensorData unavailable. Using defaults.";
            }
          };

          const buildMobileEquivalentPayload = (text) => {
            const history = messages
              .slice(0, Math.max(messages.length - 1, 0))
              .map((msg) => String(msg.text || ""))
              .filter((msg) => msg.trim().length > 0);

            return {
              userId: document.getElementById("userId").value.trim() || "mobile-user",
              message: text,
              postureState: document.getElementById("simPosture").value,
              trend: document.getElementById("simTrend").value,
              slouchDurationSec: Number(document.getElementById("simSlouchSec").value || 0),
              correctionsToday: Number(document.getElementById("simCorrections").value || 0),
              discomfortLevel: 0,
              mpuAngle: Number(document.getElementById("simMpu").value || 0),
              fsrPressure: Number(document.getElementById("simFsr").value || 0),
              vibrationActive: document.getElementById("simVib").checked,
              airChamberActive: document.getElementById("simAir").checked,
              debugModelPayload: Boolean(document.getElementById("includeModelPayload")?.checked),
              history: history.length > 12 ? history.slice(history.length - 12) : history,
            };
          };

          const sendMessage = async (presetText) => {
            const text = String(presetText ?? messageInput.value ?? "").trim();
            if (!text || (sendBtn && sendBtn.disabled)) return;

            if(errorEl) errorEl.textContent = "";
            messages.push({ sender: "user", text, options: [] });
            renderMessages();

            if (!presetText && messageInput) messageInput.value = "";
            setLoading(true);

            try {
              if(modelRawEl) modelRawEl.textContent = ""; 
              if(apiRawEl) apiRawEl.textContent = "";
              
              const payload = buildMobileEquivalentPayload(text);
              if(sentRawEl) sentRawEl.textContent = "PAYLOAD SENT TO EXPRESS:\\n" + JSON.stringify(payload, null, 2);

              const response = await fetch("/api/posture-coach/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              const contentType = (response.headers.get("content-type") || "").toLowerCase();
              let data = null;

              if (contentType.includes("application/json")) {
                data = await response.json();
                if(apiRawEl) apiRawEl.textContent = "API RESPONSE:\\n" + JSON.stringify(data, null, 2);
              } else {
                const textBody = await response.text();
                if(apiRawEl) apiRawEl.textContent = "NON-JSON RESPONSE:\\n" + textBody;
                throw new Error("Expected JSON but received " + (contentType || "unknown"));
              }

              if (response.status !== 200) {
                messages.push({ sender: "coach", text: SERVER_UNAVAILABLE, options: [] });
                return;
              }

              if (data?.debug?.modelPayload && modelRawEl) {
                modelRawEl.textContent = "MODEL PAYLOAD SENT TO AI:\\n" + JSON.stringify(data.debug.modelPayload, null, 2);
              }

              const coach = data?.coach && typeof data.coach === "object" ? data.coach : null;
              const reply = coach && typeof coach.reply === "string" ? coach.reply.trim() : "";
              const options = Array.isArray(coach?.options) ? coach.options.map(i => String(i || "").trim()).filter(Boolean) : [];

              messages.push({
                sender: "coach",
                text: reply || SERVER_UNAVAILABLE,
                options,
              });
            } catch (error) {
              messages.push({ sender: "coach", text: SERVER_UNAVAILABLE, options: [] });
              if(apiRawEl) apiRawEl.textContent = "REQUEST FAILED:\\n" + String(error.message);
              if(errorEl) errorEl.textContent = String(error.message);
            } finally {
              setLoading(false);
              renderMessages();
            }
          };

          if (sendBtn) sendBtn.addEventListener("click", () => sendMessage());
          if (messageInput) messageInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          });

          fetchInitialSensorData();
          renderMessages();

        } catch (fatalError) {
          const errDiv = document.getElementById("error");
          if(errDiv) errDiv.textContent = "CRITICAL INIT ERROR: " + fatalError.message;
        }
      });
    </script>
  </body>
</html>`);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================
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

// ============================================================================
// CHAT API (WITH OPTIMIZED AI PAYLOAD)
// ============================================================================
router.post("/api/posture-coach/chat", async (req, res) => {
  const debugRequested = req.query?.debugPayload === "1" || req.body?.debugModelPayload === true;
  const debugViaEnv = String(process.env.COACH_ALLOW_DEBUG_PAYLOAD || "").toLowerCase() === "1";
  const debugAllowed = process.env.NODE_ENV !== "production" || debugViaEnv || isLocalDebugRequest(req);
  const includeDebugModelPayload = debugRequested && debugAllowed;

  const userId = sanitizeText(req.body?.userId, 120) || DEFAULT_SINGLE_USER_ID;
  const ip = sanitizeText(req.ip, 64) || "unknown";
  const rateKey = `${userId}:${ip}`;

  const limitState = enforceRateLimit(rateKey);
  if (!limitState.allowed) {
    return res.status(429).json({ error: "Too many requests", retryAfterSec: limitState.retryAfterSec });
  }

  const message = sanitizeText(req.body?.message, MAX_MESSAGE_LENGTH);
  const postureState = sanitizeText(req.body?.postureState, 30) || "unknown";
  const trend = sanitizeText(req.body?.trend, 40) || "stable";
  const slouchDurationSec = clampNumber(req.body?.slouchDurationSec, 0, 7200);
  const correctionsToday = clampNumber(req.body?.correctionsToday, 0, 500);
  const discomfortLevel = clampNumber(req.body?.discomfortLevel, 0, 10);
  
  const mpuAngle = clampNumber(req.body?.mpuAngle, -90, 90);
  const fsrPressure = clampNumber(req.body?.fsrPressure, 0, 1024);

  const hardwareState = {
    vibrationActive: Boolean(req.body?.vibrationActive),
    airChamberActive: Boolean(req.body?.airChamberActive),
    sensors: { mpuAngle, fsrPressure }
  };

  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-MAX_HISTORY_ITEMS).map((item) => sanitizeText(String(item), 200)).filter(Boolean)
    : [];
  const languageHint = detectLanguageHint(message || history[history.length - 1] || "");

  if (!message && !req.body?.postureState) {
    return res.status(400).json({ error: "Validation error", details: "message or postureState is required" });
  }

  const emergencyText = `${message} ${trend}`.trim();

  if (isAskingAboutOmar(message)) {
    return res.status(200).json({
      source: "policy",
      coach: {
        messageType: "reinforcement", riskLevel: "low", deviceCommand: "none",
        reply: "اه ده برنس المشروع", suggestedAction: "اسألني أي حاجة تانية عن القعدة أو جهاز SitX.",
        options: ["اعمل لي تحليل سريع لآخر أسبوع", "إزاي أقلل الـ slouching؟"]
      },
      medicalNotice: "This assistant supports posture wellness only."
    });
  }

  if (hasEmergencyContent(emergencyText) || discomfortLevel >= 8) {
    return res.status(200).json({
      source: "safety",
      coach: {
        messageType: "safety", riskLevel: "high", deviceCommand: "deflate_chamber", 
        reply: "Your symptoms may need urgent care. Please contact local emergency services now.",
        suggestedAction: "Stop the session, take off the jacket, and get urgent medical help now."
      },
      medicalNotice: "This assistant cannot diagnose conditions."
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

  // 1. FILTER: Only keep active windows and give them AI-readable names
  const historicalData_ActiveWindowsOnly = {};
  for (const win of AGGREGATED_WINDOW_SEQUENCE) {
    const metrics = sanitizeWindowMetrics(aggregatedMetrics?.[win.key]);
    if (metrics.recordsInRange > 0) {
      const events = metrics.normalCount + metrics.slouchyCount;
      const slouchySharePct = events > 0 ? Number(((metrics.slouchyCount / events) * 100).toFixed(1)) : 0;
      const humanReadableKey = win.key === "today" ? "today" : `last_${win.days}_days`;
      
      historicalData_ActiveWindowsOnly[humanReadableKey] = {
        normalCount: metrics.normalCount,
        slouchyCount: metrics.slouchyCount,
        slouchySharePct: slouchySharePct
      };
    }
  }

  // 2. BUILD: Specific AI coaching instructions based on the data
  const aiCoachingDirectives = {
    overallTrend: readingsSummary.inferredTrend || "stable",
    trendMeaning: readingsSummary.insight || "No specific trend detected.",
    rules: [
      "Use 'historicalData_ActiveWindowsOnly' to answer the user's specific time-frame questions.",
      "If answering about a specific period, cite the exact normalCount vs slouchyCount.",
      "Explain the data naturally. Do not just spit out JSON arrays.",
      "If historical data is empty, mention that the user needs to wear the jacket more."
    ]
  };

  // 3. ASSEMBLE: The Optimized Payload
  const optimizedPayload = {
    userId,
    currentState: {
      posture: postureState,
      trend: trend,
      slouchDurationSec,
      correctionsToday,
      discomfortLevel
    },
    hardwareState, 
    message,
    languageHint,
    history,
    aiCoachingDirectives,
    historicalData_ActiveWindowsOnly,
  };

  const aiConfig = resolveGroqConfig();

  if (!aiConfig.apiKey) {
    return res.status(503).json({
      error: "AI_UNAVAILABLE",
      details: "The SitX posture coach is not configured.",
      ...(includeDebugModelPayload ? { debug: { modelPayload: optimizedPayload } } : {}),
    });
  }

  try {
    const modelResponse = await generateCoachReply(aiConfig, optimizedPayload);
    const coach = sanitizeModelResponse(modelResponse);

    const combinedText = `${coach.reply} ${coach.suggestedAction}`.toLowerCase();
    if (hasEmergencyContent(combinedText)) {
      coach.messageType = "safety";
      coach.riskLevel = "high";
      coach.deviceCommand = "deflate_chamber";
      coach.reply = "I cannot provide emergency medical guidance. Please seek urgent care.";
      coach.suggestedAction = "Stop the session and take off the jacket.";
    }

    return res.status(200).json({
      source: aiConfig.provider,
      model: aiConfig.model,
      coach,
      medicalNotice: "This assistant supports posture wellness only.",
      ...(includeDebugModelPayload ? { debug: { modelPayload: optimizedPayload } } : {}),
    });

  } catch (error) {
    console.error("Posture coach generation failed:", error.message);
    return res.status(503).json({
      error: "AI_UNAVAILABLE",
      details: "The AI service is temporarily offline.",
      ...(includeDebugModelPayload ? { debug: { modelPayload: optimizedPayload, reason: error.message } } : {}),
    });
  }
});

export default router;