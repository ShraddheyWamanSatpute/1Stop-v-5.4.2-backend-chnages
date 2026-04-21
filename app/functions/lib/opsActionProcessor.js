"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opsProcessActions = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const opsActions_1 = require("./opsActions");
exports.opsProcessActions = (0, scheduler_1.onSchedule)("every 10 minutes", async () => {
    await (0, opsActions_1.processApprovedActions)(5);
});
//# sourceMappingURL=opsActionProcessor.js.map