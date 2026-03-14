CREATE TABLE `session_academic_info` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`session_id` char(36) NOT NULL,
	`lesson_id` char(36) NOT NULL,
	CONSTRAINT `session_academic_info_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `year` year;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `month` enum('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec');--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `section_id` char(255);--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `code_id` char(255);--> statement-breakpoint
ALTER TABLE `session_ratings` MODIFY COLUMN `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `type` enum('private','group') NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `session_academic_info` ADD CONSTRAINT `session_academic_info_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_academic_info` ADD CONSTRAINT `session_academic_info_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_users` ADD CONSTRAINT `session_users_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_users` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `category_id`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `course_id`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `lesson_id`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `lesson_name`;