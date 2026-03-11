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
CREATE TABLE `exam_attempts` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`student_id` char(36) NOT NULL,
	`exam_id` char(255) NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` timestamp,
	`score` int,
	`is_passed` boolean,
	`status` enum('in_progress','completed','timed_out') NOT NULL DEFAULT 'in_progress',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_answers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`attempt_id` char(255) NOT NULL,
	`question_id` char(255) NOT NULL,
	`selected_option_id` char(255),
	`grid_in_answer` varchar(255),
	`is_correct` boolean NOT NULL DEFAULT false,
	`score` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `student` ADD `live_balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `student` ADD `exam_balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `student` ADD `question_balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `receiptImg` char(255);--> statement-breakpoint
ALTER TABLE `payment` ADD `source` enum('student','parent') NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `purpose` enum('wallet_recharge','purchase') NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `packageId` char(36);--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_selected_option_id_question_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_packageId_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE no action ON UPDATE no action;