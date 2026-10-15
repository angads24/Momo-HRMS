"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseService = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let SseService = SseService_1 = class SseService {
    constructor() {
        this.logger = new common_1.Logger(SseService_1.name);
        this.eventStream$ = new rxjs_1.Subject();
    }
    emitNotification(event) {
        this.logger.debug(`Broadcasting SSE notification to ${event.recipientId}`);
        this.eventStream$.next(event);
    }
    getRecipientStream(recipientId, email) {
        const cleanEmail = email ? email.trim().toLowerCase() : null;
        const cleanId = recipientId ? recipientId.trim().toLowerCase() : null;
        return this.eventStream$.asObservable().pipe((0, operators_1.filter)((event) => {
            if (event.recipientId === 'ALL' ||
                event.recipientType === 'BROADCAST' ||
                event.recipientType === 'HR' ||
                event.recipientId === 'HR' ||
                event.recipientType === 'ADMIN' ||
                event.recipientId === 'ADMIN') {
                return true;
            }
            const notif = event.notification || {};
            const meta = (notif.metadata || {});
            const eventRecipient = (event.recipientId || '').toLowerCase();
            if (cleanId && eventRecipient === cleanId)
                return true;
            if (cleanEmail && eventRecipient === cleanEmail)
                return true;
            const metaEmpCode = String(meta.employeeCode || '').toLowerCase();
            const metaUserId = String(meta.userId || '').toLowerCase();
            const metaEmail = String(meta.email || '').toLowerCase();
            const metaRecipient = String(meta.recipientId || '').toLowerCase();
            if (cleanId && (metaEmpCode === cleanId || metaUserId === cleanId || metaRecipient === cleanId)) {
                return true;
            }
            if (cleanEmail && (metaEmail === cleanEmail || eventRecipient === cleanEmail)) {
                return true;
            }
            return false;
        }), (0, operators_1.map)((event) => ({
            data: event.notification,
            type: 'notification',
        })));
    }
};
exports.SseService = SseService;
exports.SseService = SseService = SseService_1 = __decorate([
    (0, common_1.Injectable)()
], SseService);
//# sourceMappingURL=sse.service.js.map