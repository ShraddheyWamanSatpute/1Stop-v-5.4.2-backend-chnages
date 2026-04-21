"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiVersion = void 0;
const https_1 = require("firebase-functions/v2/https");
function safeJsonParse(raw) {
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        return {};
    }
}
exports.apiVersion = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "GET") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
    }
    const firebaseConfig = safeJsonParse(process.env.FIREBASE_CONFIG);
    const projectId = process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        (firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.projectId) ||
        "";
    res.set("Cache-Control", "no-store");
    res.status(200).json({
        app: "1stop",
        service: "api",
        environment: process.env.APP_ENV || projectId || "unknown",
        version: process.env.APP_VERSION || "unknown",
        gitSha: process.env.GIT_SHA || "unknown",
        buildTime: process.env.BUILD_TIME || "unknown",
    });
});
//# sourceMappingURL=apiVersion.js.map