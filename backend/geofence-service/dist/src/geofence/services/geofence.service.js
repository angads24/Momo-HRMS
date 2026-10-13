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
var GeofenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofenceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
const point_in_polygon_util_1 = require("../utils/point-in-polygon.util");
let GeofenceService = GeofenceService_1 = class GeofenceService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GeofenceService_1.name);
    }
    async verifyLocation(dto) {
        const office = await this.prisma.office.findFirst({
            where: {
                OR: [{ id: dto.officeId }, { code: dto.officeId }],
                isActive: true,
            },
            include: {
                polygons: {
                    where: { isActive: true },
                    orderBy: { version: 'desc' },
                    include: {
                        vertices: {
                            orderBy: { sequence: 'asc' },
                        },
                    },
                    take: 1,
                },
            },
        });
        if (!office) {
            this.logger.warn(`Verification failed: Office ${dto.officeId} not found or inactive.`);
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OFFICE_NOT_FOUND, 'Office not found or inactive', common_1.HttpStatus.NOT_FOUND);
        }
        const activePolygon = office.polygons[0];
        if (!activePolygon || activePolygon.vertices.length < 3) {
            this.logger.warn(`Verification failed: No active polygon configured for office ${office.name}`);
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NO_ACTIVE_POLYGON, 'No active geofence polygon configured for this office', common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const polygonPoints = activePolygon.vertices.map((v) => ({
            latitude: v.latitude,
            longitude: v.longitude,
        }));
        const point = { latitude: dto.latitude, longitude: dto.longitude };
        const isInside = (0, point_in_polygon_util_1.isPointInPolygon)(point, polygonPoints);
        const distanceToBoundary = (0, point_in_polygon_util_1.distanceToPolygonBoundaryMeters)(point, polygonPoints);
        let altitudeValid = true;
        const minAlt = activePolygon.minAltitudeMeters ?? office.minAltitudeMeters;
        const maxAlt = activePolygon.maxAltitudeMeters ?? office.maxAltitudeMeters;
        if (dto.altitudeMeters !== undefined && minAlt !== null && minAlt !== undefined && maxAlt !== null && maxAlt !== undefined) {
            altitudeValid = dto.altitudeMeters >= minAlt && dto.altitudeMeters <= maxAlt;
        }
        this.logger.log(`Verify location for office=${office.code} point=(${dto.latitude}, ${dto.longitude}) -> isInside=${isInside}, distance=${distanceToBoundary}m`);
        return {
            isInside,
            officeId: office.id,
            officeName: office.name,
            distanceToBoundaryMeters: distanceToBoundary,
            altitudeValid,
        };
    }
    async listOffices() {
        const offices = await this.prisma.office.findMany({
            include: {
                polygons: {
                    where: { isActive: true },
                    orderBy: { version: 'desc' },
                    include: {
                        vertices: { orderBy: { sequence: 'asc' } },
                    },
                    take: 1,
                },
            },
            orderBy: { name: 'asc' },
        });
        return offices.map((o) => ({
            id: o.id,
            code: o.code,
            name: o.name,
            address: o.address,
            city: o.city,
            country: o.country,
            isActive: o.isActive,
            minAltitudeMeters: o.minAltitudeMeters,
            maxAltitudeMeters: o.maxAltitudeMeters,
            activePolygon: o.polygons[0]
                ? {
                    id: o.polygons[0].id,
                    name: o.polygons[0].name,
                    version: o.polygons[0].version,
                    isActive: o.polygons[0].isActive,
                    vertices: o.polygons[0].vertices.map((v) => ({
                        sequence: v.sequence,
                        latitude: v.latitude,
                        longitude: v.longitude,
                    })),
                }
                : null,
        }));
    }
    async getOfficeById(idOrCode) {
        const office = await this.prisma.office.findFirst({
            where: {
                OR: [{ id: idOrCode }, { code: idOrCode }],
            },
            include: {
                polygons: {
                    where: { isActive: true },
                    orderBy: { version: 'desc' },
                    include: {
                        vertices: { orderBy: { sequence: 'asc' } },
                    },
                    take: 1,
                },
            },
        });
        if (!office) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OFFICE_NOT_FOUND, 'Office not found', common_1.HttpStatus.NOT_FOUND);
        }
        return {
            id: office.id,
            code: office.code,
            name: office.name,
            address: office.address,
            city: office.city,
            country: office.country,
            isActive: office.isActive,
            minAltitudeMeters: office.minAltitudeMeters,
            maxAltitudeMeters: office.maxAltitudeMeters,
            activePolygon: office.polygons[0]
                ? {
                    id: office.polygons[0].id,
                    name: office.polygons[0].name,
                    version: office.polygons[0].version,
                    isActive: office.polygons[0].isActive,
                    vertices: office.polygons[0].vertices.map((v) => ({
                        sequence: v.sequence,
                        latitude: v.latitude,
                        longitude: v.longitude,
                    })),
                }
                : null,
        };
    }
    async createOffice(dto) {
        const existing = await this.prisma.office.findUnique({
            where: { code: dto.code },
        });
        if (existing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.DUPLICATE_OFFICE_CODE, `Office with code ${dto.code} already exists`, common_1.HttpStatus.CONFLICT);
        }
        return this.prisma.office.create({
            data: {
                code: dto.code,
                name: dto.name,
                address: dto.address,
                city: dto.city,
                country: dto.country,
                minAltitudeMeters: dto.minAltitudeMeters,
                maxAltitudeMeters: dto.maxAltitudeMeters,
                isActive: dto.isActive ?? true,
            },
        });
    }
    async setOfficePolygon(idOrCode, dto) {
        const office = await this.prisma.office.findFirst({
            where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
        });
        if (!office) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OFFICE_NOT_FOUND, 'Office not found', common_1.HttpStatus.NOT_FOUND);
        }
        const validation = (0, point_in_polygon_util_1.validatePolygonVertices)(dto.vertices);
        if (!validation.valid) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_POLYGON, validation.error ?? 'Invalid polygon vertices', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.geofencePolygon.updateMany({
                where: { officeId: office.id, isActive: true },
                data: { isActive: false },
            });
            const count = await tx.geofencePolygon.count({
                where: { officeId: office.id },
            });
            const newPolygon = await tx.geofencePolygon.create({
                data: {
                    officeId: office.id,
                    name: dto.name ?? `Boundary v${count + 1}`,
                    version: count + 1,
                    isActive: true,
                    minAltitudeMeters: dto.minAltitudeMeters,
                    maxAltitudeMeters: dto.maxAltitudeMeters,
                    vertices: {
                        create: dto.vertices.map((v, index) => ({
                            sequence: index,
                            latitude: v.latitude,
                            longitude: v.longitude,
                        })),
                    },
                },
                include: {
                    vertices: { orderBy: { sequence: 'asc' } },
                },
            });
            return newPolygon;
        });
    }
    async deleteOfficePolygon(idOrCode, hard = true) {
        const office = await this.prisma.office.findFirst({
            where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
        });
        if (!office) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OFFICE_NOT_FOUND, 'Office not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (hard) {
            const { count } = await this.prisma.geofencePolygon.deleteMany({
                where: { officeId: office.id },
            });
            this.logger.log(`Hard deleted ${count} geofence polygons for office ${office.code}`);
            return {
                officeId: office.id,
                officeCode: office.code,
                deletedPolygonsCount: count,
                message: 'Office geofence polygon(s) deleted successfully',
            };
        }
        else {
            const { count } = await this.prisma.geofencePolygon.updateMany({
                where: { officeId: office.id, isActive: true },
                data: { isActive: false },
            });
            this.logger.log(`Deactivated ${count} geofence polygons for office ${office.code}`);
            return {
                officeId: office.id,
                officeCode: office.code,
                deactivatedPolygonsCount: count,
                message: 'Office geofence polygon(s) deactivated successfully',
            };
        }
    }
    async deletePolygonById(polygonId) {
        const existing = await this.prisma.geofencePolygon.findUnique({
            where: { id: polygonId },
        });
        if (!existing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NO_ACTIVE_POLYGON, 'Geofence polygon not found', common_1.HttpStatus.NOT_FOUND);
        }
        await this.prisma.geofencePolygon.delete({
            where: { id: polygonId },
        });
        this.logger.log(`Deleted geofence polygon ${polygonId}`);
        return {
            polygonId,
            message: 'Geofence polygon deleted successfully',
        };
    }
    async deleteOffice(idOrCode, hard = true) {
        const office = await this.prisma.office.findFirst({
            where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
        });
        if (!office) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OFFICE_NOT_FOUND, 'Office not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (hard) {
            await this.prisma.office.delete({
                where: { id: office.id },
            });
            this.logger.log(`Deleted office ${office.code} and all associated geofence polygons`);
            return {
                officeId: office.id,
                officeCode: office.code,
                message: 'Office and all associated geofence data deleted successfully',
            };
        }
        else {
            await this.prisma.$transaction([
                this.prisma.office.update({
                    where: { id: office.id },
                    data: { isActive: false },
                }),
                this.prisma.geofencePolygon.updateMany({
                    where: { officeId: office.id },
                    data: { isActive: false },
                }),
            ]);
            this.logger.log(`Deactivated office ${office.code}`);
            return {
                officeId: office.id,
                officeCode: office.code,
                message: 'Office and geofence deactivated successfully',
            };
        }
    }
};
exports.GeofenceService = GeofenceService;
exports.GeofenceService = GeofenceService = GeofenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GeofenceService);
//# sourceMappingURL=geofence.service.js.map