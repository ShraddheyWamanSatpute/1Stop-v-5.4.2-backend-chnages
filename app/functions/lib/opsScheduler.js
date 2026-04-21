"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opsSyncAll = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const opsProviders_1 = require("./opsProviders");
const SYSTEM_ACTOR = { uid: "system", email: "system@ops" };
exports.opsSyncAll = (0, scheduler_1.onSchedule)("every 30 minutes", async () => {
    const results = {};
    // Each sync function checks env vars and will throw if configured but broken.
    // We intentionally isolate failures so one provider doesn't block the others.
    try {
        results.github = await (0, opsProviders_1.githubSync)(SYSTEM_ACTOR);
    }
    catch (e) {
        results.github = { ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e || "Failed") };
    }
    try {
        results.jira = await (0, opsProviders_1.jiraSync)(SYSTEM_ACTOR);
    }
    catch (e) {
        results.jira = { ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e || "Failed") };
    }
    try {
        results.jenkins = await (0, opsProviders_1.jenkinsSync)(SYSTEM_ACTOR);
    }
    catch (e) {
        results.jenkins = { ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e || "Failed") };
    }
    // Linking: attach Jira keys to recent deployments where possible.
    try {
        results.enrichDeployments = await (0, opsProviders_1.enrichDeploymentsWithJiraKeys)(200, SYSTEM_ACTOR);
    }
    catch (e) {
        results.enrichDeployments = { ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e || "Failed") };
    }
    return results;
});
//# sourceMappingURL=opsScheduler.js.map