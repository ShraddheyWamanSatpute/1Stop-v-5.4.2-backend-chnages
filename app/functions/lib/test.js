"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFunction = void 0;
const firebase_functions_1 = require("firebase-functions");
exports.testFunction = firebase_functions_1.https.onRequest((req, res) => {
    res.json({ message: 'Test function is working!' });
});
//# sourceMappingURL=test.js.map