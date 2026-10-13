CREATE TABLE `student_availability_plans` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`student_id` char(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`notes` text,
	`status` enum('pending_admin_review','plan_proposed','accepted','rejected','cancelled') NOT NULL DEFAULT 'pending_admin_review',
	`admin_notes` text,
	`student_feedback` text,
	`proposed_by` char(255),
	`proposed_at` timestamp,
	`responded_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_availability_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_availability_slots` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`plan_id` char(36) NOT NULL,
	`day_of_week` enum('Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'),
	`specific_date` date,
	`time_from` time NOT NULL,
	`time_to` time NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `student_availability_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_plan_sessions` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`plan_id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`notes` varchar(255),
	`order_index` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `student_plan_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_session_unique` UNIQUE(`plan_id`,`session_id`)
);
--> statement-breakpoint
ALTER TABLE `student_availability_plans` ADD CONSTRAINT `student_availability_plans_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_availability_plans` ADD CONSTRAINT `student_availability_plans_proposed_by_admins_id_fk` FOREIGN KEY (`proposed_by`) REFERENCES `admins`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_availability_slots` ADD CONSTRAINT `student_availability_slots_plan_id_student_availability_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `student_availability_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_plan_sessions` ADD CONSTRAINT `student_plan_sessions_plan_id_student_availability_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `student_availability_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_plan_sessions` ADD CONSTRAINT `student_plan_sessions_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `student_plans_student_idx` ON `student_availability_plans` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_plans_status_idx` ON `student_availability_plans` (`status`);--> statement-breakpoint
CREATE INDEX `availability_slots_plan_idx` ON `student_availability_slots` (`plan_id`);--> statement-breakpoint
CREATE INDEX `plan_sessions_plan_idx` ON `student_plan_sessions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `plan_sessions_session_idx` ON `student_plan_sessions` (`session_id`);