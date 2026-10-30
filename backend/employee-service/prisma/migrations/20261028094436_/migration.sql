-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `designations` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `department_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `designations_code_key`(`code`),
    INDEX `designations_department_id_idx`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `employee_code` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NULL,
    `first_name` VARCHAR(64) NOT NULL,
    `last_name` VARCHAR(64) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `personal_email` VARCHAR(255) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `gender` VARCHAR(32) NULL,
    `blood_group` VARCHAR(16) NULL,
    `address` TEXT NULL,
    `permanent_address` TEXT NULL,
    `alternate_phone` VARCHAR(32) NULL,
    `emergency_contact_name` VARCHAR(128) NULL,
    `emergency_contact_relation` VARCHAR(64) NULL,
    `emergency_contact_phone` VARCHAR(32) NULL,
    `profile_photo_url` LONGTEXT NULL,
    `is_onboarded` BOOLEAN NOT NULL DEFAULT false,
    `department_id` VARCHAR(191) NULL,
    `designation_id` VARCHAR(191) NULL,
    `employment_status` ENUM('ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `date_of_joining` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_employee_code_key`(`employee_code`),
    UNIQUE INDEX `employees_user_id_key`(`user_id`),
    UNIQUE INDEX `employees_email_key`(`email`),
    INDEX `employees_department_id_idx`(`department_id`),
    INDEX `employees_designation_id_idx`(`designation_id`),
    INDEX `employees_employment_status_idx`(`employment_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_office_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `office_id` VARCHAR(64) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT true,
    `effective_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effective_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employee_office_assignments_employee_id_idx`(`employee_id`),
    INDEX `employee_office_assignments_office_id_idx`(`office_id`),
    INDEX `employee_office_assignments_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `designations` ADD CONSTRAINT `designations_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_designation_id_fkey` FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_office_assignments` ADD CONSTRAINT `employee_office_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
