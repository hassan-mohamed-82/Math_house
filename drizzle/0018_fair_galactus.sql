CREATE TABLE `admin_availability_slots` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`day_of_week` enum('Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday') NOT NULL,
	`time_from` time NOT NULL,
	`time_to` time NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` char(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_availability_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `student_availability_plans` DROP FOREIGN KEY `student_availability_plans_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `student_availability_slots` ADD `admin_slot_id` char(36);--> statement-breakpoint
ALTER TABLE `admin_availability_slots` ADD CONSTRAINT `admin_availability_slots_created_by_admins_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_slots_day_idx` ON `admin_availability_slots` (`day_of_week`);--> statement-breakpoint
CREATE INDEX `admin_slots_active_idx` ON `admin_availability_slots` (`is_active`);--> statement-breakpoint
ALTER TABLE `student_availability_slots` ADD CONSTRAINT `student_availability_slots_admin_slot_id_admin_availability_slots_id_fk` FOREIGN KEY (`admin_slot_id`) REFERENCES `admin_availability_slots`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `availability_slots_admin_slot_idx` ON `student_availability_slots` (`admin_slot_id`);--> statement-breakpoint
ALTER TABLE `student_availability_plans` DROP COLUMN `course_id`;