"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingTimeService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("../enums");
let WorkingTimeService = class WorkingTimeService {
    calculateWorkingSeconds(session, pauses = [], now = new Date()) {
        const referenceEnd = this.resolveReferenceEnd(session, now);
        const grossSeconds = Math.max(0, (referenceEnd.getTime() - session.checkInAt.getTime()) / 1000);
        const pausedSeconds = this.sumPauseSeconds(pauses || [], referenceEnd);
        return Math.max(0, Math.round(grossSeconds - pausedSeconds));
    }
    resolveReferenceEnd(session, now) {
        if (session.status === enums_1.AttendanceStatus.CHECKED_OUT) {
            return session.checkOutAt ?? now;
        }
        if (session.status === enums_1.AttendanceStatus.PAUSED && session.currentPauseStartedAt) {
            return session.currentPauseStartedAt;
        }
        return now;
    }
    sumPauseSeconds(pauses, referenceEnd) {
        let total = 0;
        for (const pause of pauses) {
            const end = pause.endedAt ?? referenceEnd;
            const durationMs = end.getTime() - pause.startedAt.getTime();
            if (durationMs > 0) {
                total += durationMs / 1000;
            }
        }
        return total;
    }
};
exports.WorkingTimeService = WorkingTimeService;
exports.WorkingTimeService = WorkingTimeService = __decorate([
    (0, common_1.Injectable)()
], WorkingTimeService);
//# sourceMappingURL=working-time.service.js.map