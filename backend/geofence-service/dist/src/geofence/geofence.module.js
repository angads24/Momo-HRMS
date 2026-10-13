"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofenceModule = void 0;
const common_1 = require("@nestjs/common");
const geofence_controller_1 = require("./controllers/geofence.controller");
const office_controller_1 = require("./controllers/office.controller");
const geofence_service_1 = require("./services/geofence.service");
let GeofenceModule = class GeofenceModule {
};
exports.GeofenceModule = GeofenceModule;
exports.GeofenceModule = GeofenceModule = __decorate([
    (0, common_1.Module)({
        controllers: [geofence_controller_1.GeofenceController, office_controller_1.OfficeController],
        providers: [geofence_service_1.GeofenceService],
        exports: [geofence_service_1.GeofenceService],
    })
], GeofenceModule);
//# sourceMappingURL=geofence.module.js.map