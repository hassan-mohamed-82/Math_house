CREATE TABLE `student_parallel_attempts` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`student_id` char(36) NOT NULL,
	`exam_attempt_id` char(255) NOT NULL,
	`status` enum('in_progress','completed') NOT NULL DEFAULT 'in_progress',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_parallel_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_parallel_answers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`parallel_attempt_id` char(255) NOT NULL,
	`parallel_question_id` char(255) NOT NULL,
	`selected_option_id` char(255),
	`grid_in_answer` varchar(255),
	`is_correct` boolean NOT NULL DEFAULT false,
	`score` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_parallel_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `content_access_days` int;--> statement-breakpoint
ALTER TABLE `payment` ADD `promoCodeId` char(255);--> statement-breakpoint
ALTER TABLE `student_parallel_attempts` ADD CONSTRAINT `student_parallel_attempts_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_parallel_attempts` ADD CONSTRAINT `student_parallel_attempts_exam_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`exam_attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_parallel_answers` ADD CONSTRAINT `student_parallel_answers_parallel_attempt_id_student_parallel_attempts_id_fk` FOREIGN KEY (`parallel_attempt_id`) REFERENCES `student_parallel_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_parallel_answers` ADD CONSTRAINT `student_parallel_answers_parallel_question_id_parallel_questions_id_fk` FOREIGN KEY (`parallel_question_id`) REFERENCES `parallel_questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_parallel_answers` ADD CONSTRAINT `student_parallel_answers_selected_option_id_parallel_question_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `parallel_question_options`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE set null ON UPDATE no action;