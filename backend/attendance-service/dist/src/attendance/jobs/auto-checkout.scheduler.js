"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AutoCheckoutScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoCheckoutScheduler = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const cron_1 = require("cron");
const attendance_service_1 = require("../services/attendance.service");
let AutoCheckoutScheduler = AutoCheckoutScheduler_1 = class AutoCheckoutScheduler {
    constructor(attendanceService, configService, schedulerRegistry) {
        this.attendanceService = attendanceService;
        this.configService = configService;
        this.schedulerRegistry = schedulerRegistry;
        this.logger = new common_1.Logger(AutoCheckoutScheduler_1.name);
        const { cron, batchSize } = this.configService.get('autoCheckout', { infer: true });
        const job = new cron_1.CronJob(cron, () => {
            this.runSweep(batchSize).catch((error) => {
                this.logger.error(`Auto-checkout sweep crashed: ${error.message}`);
            });
        });
        this.schedulerRegistry.addCronJob('auto-checkout-sweep', job);
        job.start();
        this.logger.log(`Auto-checkout scheduler started (cron="${cron}", batchSize=${batchSize})`);
    }
    async runSweep(batchSize) {
        await this.attendanceService.runAutoCheckoutSweep(batchSize, new Date());
    }
};
exports.AutoCheckoutScheduler = AutoCheckoutScheduler;
exports.AutoCheckoutScheduler = AutoCheckoutScheduler = AutoCheckoutScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService,
        config_1.ConfigService,
        schedule_1.SchedulerRegistry])
], AutoCheckoutScheduler);
//# sourceMappingURL=auto-checkout.scheduler.js.map