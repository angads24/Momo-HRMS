"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterMiddleware = void 0;
const common_1 = require("@nestjs/common");
let RateLimiterMiddleware = class RateLimiterMiddleware {
    constructor() {
        this.records = new Map();
    }
    use(req, res, next) {
        const now = Date.now();
        const path = req.path || req.originalUrl || '';
        let key = '';
        let maxAttempts = 100;
        const windowMs = 60 * 1000;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        if (path.includes('/auth/login') && req.method === 'POST') {
            key = `auth_login:${clientIp}`;
            maxAttempts = 5;
        }
        else if (path.includes('/face/verify') && req.method === 'POST') {
            const employeeId = req.body?.employee_id || req.headers['x-employee-id'] || clientIp;
            key = `face_verify:${employeeId}`;
            maxAttempts = 10;
        }
        if (key) {
            let record = this.records.get(key);
            if (!record || now > record.resetAt) {
                record = { count: 1, resetAt: now + windowMs };
                this.records.set(key, record);
            }
            else {
                record.count += 1;
            }
            const remaining = Math.max(0, maxAttempts - record.count);
            const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
            res.setHeader('X-RateLimit-Limit', maxAttempts);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
            if (record.count > maxAttempts) {
                res.setHeader('Retry-After', retryAfterSeconds);
                res.status(common_1.HttpStatus.TOO_MANY_REQUESTS).json({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    error: 'Too Many Requests',
                    message: maxAttempts === 5
                        ? 'Too many login attempts. Please wait 1 minute before trying again.'
                        : 'Too many face verification attempts. Please wait 1 minute before trying again.',
                    retryAfterSeconds,
                });
                return;
            }
        }
        if (this.records.size > 2000) {
            for (const [k, v] of this.records.entries()) {
                if (now > v.resetAt) {
                    this.records.delete(k);
                }
            }
        }
        next();
    }
};
exports.RateLimiterMiddleware = RateLimiterMiddleware;
exports.RateLimiterMiddleware = RateLimiterMiddleware = __decorate([
    (0, common_1.Injectable)()
], RateLimiterMiddleware);
//# sourceMappingURL=rate-limiter.middleware.js.map