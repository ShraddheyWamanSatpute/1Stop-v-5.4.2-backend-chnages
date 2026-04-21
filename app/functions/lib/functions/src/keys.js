"use strict";
// Server-side keys for Functions (testing)
// Single source of truth is `src/shared/KeyVault.ts`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.FUNCTION_KEYS = void 0;
// eslint-disable-next-line import/no-relative-packages
var KeyVault_1 = require("../../src/shared/KeyVault");
Object.defineProperty(exports, "FUNCTION_KEYS", { enumerable: true, get: function () { return KeyVault_1.FUNCTION_KEYS; } });
// eslint-disable-next-line import/no-relative-packages
var KeyVault_2 = require("../../src/shared/KeyVault");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return KeyVault_2.FUNCTION_KEYS; } });
//# sourceMappingURL=keys.js.map