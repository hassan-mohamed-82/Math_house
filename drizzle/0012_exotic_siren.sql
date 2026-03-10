CREATE TABLE `session_attendance` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`session_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`status` enum('present','absent') NOT NULL DEFAULT 'absent',
	`attended_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `session_attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_student_unique` UNIQUE(`session_id`,`student_id`)
);
--> statement-breakpoint
ALTER TABLE `student` ADD `live_balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `student` ADD `exam_balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `student` ADD `question_balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `receiptImg` char(255);--> statement-breakpoint
ALTER TABLE `payment` ADD `source` enum('student','parent') NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `purpose` enum('wallet_recharge','course_purchase') NOT NULL;--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;