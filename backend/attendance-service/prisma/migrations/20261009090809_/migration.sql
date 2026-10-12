-- CreateTable
CREATE TABLE `attendance_exceptions` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(64) NOT NULL,
    `attendance_date` DATE NOT NULL,
    `attendance_session_id` VARCHAR(64) NULL,
    `type` ENUM('RECHECK_IN', 'EXTRA_GRACE', 'OFFICE_TRANSFER', 'WORKING_TIME_ADJUSTMENT') NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `approved_by_user_id` VARCHAR(64) NULL,
    `approved_at` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'USED') NOT NULL DEFAULT 'PENDING',
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attendance_exceptions_employee_id_idx`(`employee_id`),
    INDEX `attendance_exceptions_attendance_date_idx`(`attendance_date`),
    INDEX `attendance_exceptions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance_exceptions` ADD CONSTRAINT `attendance_exceptions_attendance_session_id_fkey` FOREIGN KEY (`attendance_session_id`) REFERENCES `attendance_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
