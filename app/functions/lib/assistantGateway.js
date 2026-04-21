"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assistantGateway = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
function json(res, status, body) {
    res.set("Cache-Control", "no-store");
    res.status(status).json(body);
}
function getBearerToken(req) {
    var _a, _b;
    const h = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization) || "");
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
}
function buildPrompt(userMessage, contextData, options) {
    var _a, _b;
    const ctxJson = contextData ? JSON.stringify(contextData, null, 2) : "{}";
    const responseMode = (options === null || options === void 0 ? void 0 : options.responseMode) || "summary";
    const dateRangeLabel = (options === null || options === void 0 ? void 0 : options.dateRangeLabel) || ((_b = (_a = contextData === null || contextData === void 0 ? void 0 : contextData.analyticsSnapshot) === null || _a === void 0 ? void 0 : _a.dateRange) === null || _b === void 0 ? void 0 : _b.label) || "selected period";
    const responseSchema = responseMode === "metric"
        ? "Return ONLY JSON with keys: answer (string), timeframe (string, optional), caveat (string, optional)."
        : responseMode === "comparison"
            ? "Return ONLY JSON with keys: lead (string), bullets (array of up to 3 short strings), caveat (string, optional)."
            : responseMode === "action"
                ? "Return ONLY JSON with keys: lead (string), actions (array of up to 4 short strings), caveat (string, optional)."
                : "Return ONLY JSON with keys: lead (string), bullets (array of 2 to 4 short strings), caveat (string, optional).";
    return `You are a helpful AI assistant for a hospitality business (restaurant, pub, bar, hotel, events, quick service).
Assume currency is GBP (£) unless the user specifies otherwise.

You will receive a JSON context that includes:
- analyticsSnapshot: actual metric names/keys and values (KPIs + small charts)
- metricDictionary: canonical metric keys/labels you MUST treat as the real names of data
- derivedMetrics: metrics calculated from available data
- chatHistory: recent conversation turns
- learnedPreferences: user-stated preferences to follow (from earlier in this assistant chat)

RULES (IMPORTANT):
- Be brief. Answer only what was asked for. No long preambles.
- Understand bad grammar and misspellings; infer intent.
- If the user asks for a specific metric, return just the value + timeframe. If you used a derived metric, say "(calculated)".
- Do not invent numbers. If missing, try to compute from available data; if still missing, ask ONE clarifying question.
- When referencing metrics internally, prefer the provided metricDictionary keys/labels.
- Start with the answer, not a recap of the question.
- Mention the timeframe when giving numbers. Use "${dateRangeLabel}" when relevant.
- Do not use markdown headings unless the user explicitly asks for a report.
- Prefer these response shapes:
  - metric: one sentence or one short line
  - comparison: up to 3 bullets
  - summary: 2-4 short bullets or 2 short paragraphs
  - action: up to 4 bullets focused on what to do next
- If the data is partial, say so briefly and answer from what is available.

CURRENT RESPONSE MODE: ${responseMode}

CONTEXT (JSON):
${ctxJson}

USER:
${userMessage}

${responseSchema}

Respond now as valid JSON only.`;
}
async function generateAssistantText(prompt) {
    var _a, _b, _c, _d;
    const apiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    const model = String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
    if (!apiKey) {
        throw new Error("Assistant gateway is not configured");
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.25,
                maxOutputTokens: 768,
                topP: 0.8,
                topK: 40,
            },
        }),
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Assistant gateway request failed: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    const text = ((_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.map((part) => String((part === null || part === void 0 ? void 0 : part.text) || "")).join("")) || "";
    if (!text.trim())
        throw new Error("Assistant gateway returned an empty response");
    return text;
}
function renderResponse(text, responseMode) {
    try {
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        if (responseMode === "metric") {
            const answer = String(parsed.answer || "").trim();
            const timeframe = String(parsed.timeframe || "").trim();
            const caveat = String(parsed.caveat || "").trim();
            return [answer, timeframe ? `(${timeframe})` : "", caveat ? ` ${caveat}` : ""].join("").trim();
        }
        const lead = String(parsed.lead || "").trim();
        const list = Array.isArray(parsed.actions)
            ? parsed.actions
            : Array.isArray(parsed.bullets)
                ? parsed.bullets
                : [];
        const caveat = String(parsed.caveat || "").trim();
        const renderedList = list
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, responseMode === "action" ? 4 : responseMode === "comparison" ? 3 : 4)
            .map((item) => `- ${item}`)
            .join("\n");
        return [lead, renderedList, caveat].filter(Boolean).join("\n").trim();
    }
    catch (_a) {
        return String(text || "").trim();
    }
}
exports.assistantGateway = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b;
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        json(res, 405, { ok: false, error: "Method not allowed" });
        return;
    }
    try {
        const token = getBearerToken(req);
        if (!token) {
            json(res, 401, { ok: false, error: "Missing bearer token" });
            return;
        }
        await (0, auth_1.getAuth)().verifyIdToken(token);
        const body = req.body || {};
        const userMessage = String((body === null || body === void 0 ? void 0 : body.userMessage) || "").trim();
        const contextData = (body === null || body === void 0 ? void 0 : body.contextData) || {};
        const responseMode = (((_a = body === null || body === void 0 ? void 0 : body.options) === null || _a === void 0 ? void 0 : _a.responseMode) || "summary");
        const dateRangeLabel = typeof ((_b = body === null || body === void 0 ? void 0 : body.options) === null || _b === void 0 ? void 0 : _b.dateRangeLabel) === "string" ? body.options.dateRangeLabel : undefined;
        if (!userMessage) {
            json(res, 400, { ok: false, error: "Missing userMessage" });
            return;
        }
        const prompt = buildPrompt(userMessage, contextData, { responseMode, dateRangeLabel });
        const raw = await generateAssistantText(prompt);
        const text = renderResponse(raw, responseMode);
        json(res, 200, { ok: true, text });
    }
    catch (error) {
        json(res, 500, {
            ok: false,
            error: (error === null || error === void 0 ? void 0 : error.message) || "Assistant gateway failed",
        });
    }
});
//# sourceMappingURL=assistantGateway.js.map