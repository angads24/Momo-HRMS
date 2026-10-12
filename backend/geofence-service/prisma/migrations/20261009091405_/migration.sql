-- CreateTable
CREATE TABLE `offices` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(64) NULL,
    `country` VARCHAR(64) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `min_altitude_meters` DOUBLE NULL,
    `max_altitude_meters` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `offices_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `geofence_polygons` (
    `id` VARCHAR(191) NOT NULL,
    `office_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(128) NOT NULL DEFAULT 'Main Boundary',
    `version` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `min_altitude_meters` DOUBLE NULL,
    `max_altitude_meters` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `geofence_polygons_office_id_idx`(`office_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `geofence_vertices` (
    `id` VARCHAR(191) NOT NULL,
    `polygon_id` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `geofence_vertices_polygon_id_idx`(`polygon_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `geofence_polygons` ADD CONSTRAINT `geofence_polygons_office_id_fkey` FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `geofence_vertices` ADD CONSTRAINT `geofence_vertices_polygon_id_fkey` FOREIGN KEY (`polygon_id`) REFERENCES `geofence_polygons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
