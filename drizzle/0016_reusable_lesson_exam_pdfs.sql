CREATE TABLE `session_student_pdfs` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`session_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`session_pdf` varchar(500),
	`session_answers_pdf` varchar(500),
	`teacher_explanation_pdf` varchar(500),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_student_pdfs_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_student_pdf_unique` UNIQUE(`session_id`,`student_id`)
);
--> statement-breakpoint
ALTER TABLE `lessons` ADD `session_pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `lessons` ADD `session_answers_pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `exams` ADD `session_pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `exams` ADD `session_answers_pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `sessions` ADD `exam_id` char(255);--> statement-breakpoint
ALTER TABLE `sessions` ADD `session_pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `sessions` ADD `session_answers_pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `sessions` ADD `teacher_explanation_pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `session_student_pdfs` ADD CONSTRAINT `session_student_pdfs_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_student_pdfs` ADD CONSTRAINT `session_student_pdfs_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `session_student_pdfs_session_idx` ON `session_student_pdfs` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_student_pdfs_student_idx` ON `session_student_pdfs` (`student_id`);
