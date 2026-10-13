"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncResultStatus = exports.AttendanceEventSource = exports.AttendanceEventType = exports.PauseEndReason = exports.CheckoutReason = exports.CheckoutType = exports.CheckInStatus = exports.AttendanceStatus = void 0;
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "AttendanceStatus", { enumerable: true, get: function () { return client_1.AttendanceStatus; } });
Object.defineProperty(exports, "CheckInStatus", { enumerable: true, get: function () { return client_1.CheckInStatus; } });
Object.defineProperty(exports, "CheckoutType", { enumerable: true, get: function () { return client_1.CheckoutType; } });
Object.defineProperty(exports, "CheckoutReason", { enumerable: true, get: function () { return client_1.CheckoutReason; } });
Object.defineProperty(exports, "PauseEndReason", { enumerable: true, get: function () { return client_1.PauseEndReason; } });
Object.defineProperty(exports, "AttendanceEventType", { enumerable: true, get: function () { return client_1.AttendanceEventType; } });
Object.defineProperty(exports, "AttendanceEventSource", { enumerable: true, get: function () { return client_1.AttendanceEventSource; } });
var SyncResultStatus;
(function (SyncResultStatus) {
    SyncResultStatus["PROCESSED"] = "PROCESSED";
    SyncResultStatus["ALREADY_PROCESSED"] = "ALREADY_PROCESSED";
    SyncResultStatus["REJECTED"] = "REJECTED";
    SyncResultStatus["INVALID_STATE"] = "INVALID_STATE";
})(SyncResultStatus || (exports.SyncResultStatus = SyncResultStatus = {}));
//# sourceMappingURL=index.js.map