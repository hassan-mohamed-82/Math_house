CREATE TABLE `raw_score` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`course_id` char(255) NOT NULL,
	`score` int NOT NULL,
	`is_gift` boolean NOT NULL DEFAULT false,
	`gifting_score` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `raw_score_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnostic_exam` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`title` varchar(255) NOT NULL,
	`description` varchar(255),
	`duration` int NOT NULL,
	`total_score` int NOT NULL,
	`pass_score` int NOT NULL,
	`raw_score_id` char(255) NOT NULL,
	`number_of_questions` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diagnostic_exam_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnostic_exam_questions` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`diagnostic_exam_id` char(255) NOT NULL,
	`question_id` char(255) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diagnostic_exam_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`section_name` varchar(255) NOT NULL,
	`section_description` varchar(255),
	`section_time` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adaptive_exam` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`exam_id` char(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adaptive_exam_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_sections` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`section_id` char(255) NOT NULL,
	`section_order` int NOT NULL,
	`exam_id` char(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exam_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`title` varchar(255) NOT NULL,
	`description` varchar(255),
	`duration` int NOT NULL,
	`total_score` int NOT NULL,
	`pass_score` int NOT NULL,
	`raw_score_id` char(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`exam_type` enum('static','adaptive') NOT NULL,
	`course_id` char(255) NOT NULL,
	`year` int NOT NULL,
	`month` enum('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec') NOT NULL,
	`code_id` char(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `section_questions` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`question_order` int NOT NULL,
	`section_id` char(255) NOT NULL,
	`question_id` char(255) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `section_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `currency` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`symbol` varchar(255) NOT NULL,
	`code` varchar(10) NOT NULL,
	`exchange_rate` decimal(18,6) NOT NULL DEFAULT '1.000000',
	`is_base` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `currency_id` PRIMARY KEY(`id`),
	CONSTRAINT `currency_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `conversion_rate` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`from_currency_id` char(255) NOT NULL,
	`to_currency_id` char(255) NOT NULL,
	`rate` decimal(18,6) NOT NULL,
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `conversion_rate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questions` RENAME COLUMN `section` TO `section_id`;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `section_id` char(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `raw_score` ADD CONSTRAINT `raw_score_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD CONSTRAINT `diagnostic_exam_raw_score_id_raw_score_id_fk` FOREIGN KEY (`raw_score_id`) REFERENCES `raw_score`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_questions` ADD CONSTRAINT `diagnostic_exam_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_questions` ADD CONSTRAINT `diag_exam_q_exam_id_fk` FOREIGN KEY (`diagnostic_exam_id`) REFERENCES `diagnostic_exam`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adaptive_exam` ADD CONSTRAINT `adaptive_exam_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_sections` ADD CONSTRAINT `exam_sections_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_sections` ADD CONSTRAINT `exam_sections_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_raw_score_id_raw_score_id_fk` FOREIGN KEY (`raw_score_id`) REFERENCES `raw_score`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_code_id_exam_codes_id_fk` FOREIGN KEY (`code_id`) REFERENCES `exam_codes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `section_questions` ADD CONSTRAINT `section_questions_section_id_exam_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `exam_sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `section_questions` ADD CONSTRAINT `section_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversion_rate` ADD CONSTRAINT `conversion_rate_from_currency_id_currency_id_fk` FOREIGN KEY (`from_currency_id`) REFERENCES `currency`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversion_rate` ADD CONSTRAINT `conversion_rate_to_currency_id_currency_id_fk` FOREIGN KEY (`to_currency_id`) REFERENCES `currency`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action;