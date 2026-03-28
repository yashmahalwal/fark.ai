"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logZodError = logZodError;
function logZodError(error, logger) {
    logger.error({ issues: error.issues }, "Validation failed");
}
//# sourceMappingURL=log-zod-error.js.map