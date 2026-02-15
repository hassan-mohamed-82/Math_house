CREATE TABLE `teachers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone_number` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`avatar` varchar(500),
	`category_id` char(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`category_id` char(255) NOT NULL,
	`semester_id` char(255),
	`description` varchar(255),
	`image` varchar(255),
	`pre_requisition` varchar(255),
	`what_you_gain` varchar(255),
	`duration` varchar(255),
	`price` double NOT NULL,
	`discount` double DEFAULT 0,
	`total_amount` double GENERATED ALWAYS AS (price - COALESCE(discount, 0)) VIRTUAL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`category_id` char(255) NOT NULL,
	`course_id` char(255) NOT NULL,
	`description` varchar(255),
	`image` varchar(255),
	`teacher_id` char(255) NOT NULL,
	`order` int NOT NULL,
	`pre_requisition` varchar(255),
	`what_you_gain` varchar(255),
	`duration` varchar(255) NOT NULL,
	`price` double NOT NULL,
	`discount` double DEFAULT 0,
	`total_amount` double GENERATED ALWAYS AS (price - COALESCE(discount, 0)) VIRTUAL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `semesters` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`category_id` char(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `semesters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_teachers` (
	`course_id` char(255) NOT NULL,
	`teacher_id` char(255) NOT NULL,
	`role` varchar(100) DEFAULT 'instructor',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `course_teachers_course_id_teacher_id_pk` PRIMARY KEY(`course_id`,`teacher_id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_ideas` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`idea` varchar(255) NOT NULL,
	`lesson_id` char(255) NOT NULL,
	`idea_order` int NOT NULL,
	`pdf` varchar(255),
	`video` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_ideas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`category_id` char(255) NOT NULL,
	`course_id` char(255) NOT NULL,
	`chapter_id` char(255) NOT NULL,
	`description` varchar(255),
	`image` varchar(255),
	`teacher_id` char(255) NOT NULL,
	`order` int NOT NULL,
	`pre_requisition` varchar(255),
	`what_you_gain` varchar(255),
	`price` double NOT NULL,
	`discount` double DEFAULT 0,
	`total_amount` double GENERATED ALWAYS AS (price - COALESCE(discount, 0)) VIRTUAL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parallel_questions` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`question_id` char(255) NOT NULL,
	`question` varchar(255) NOT NULL,
	`answerType` enum('MCQ','Grid in') NOT NULL,
	`difficulty` enum('A','B','C','D','E') NOT NULL,
	`lesson_id` char(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parallel_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parallel_question_options` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`question_id` char(255) NOT NULL,
	`answer` varchar(255) NOT NULL,
	`is_correct` boolean NOT NULL DEFAULT false,
	`order` char(1),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parallel_question_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_answers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`question_id` char(255) NOT NULL,
	`answer_pdf` varchar(255),
	`answer_video` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_options` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`question_id` char(255) NOT NULL,
	`answer` varchar(255) NOT NULL,
	`is_correct` boolean NOT NULL DEFAULT false,
	`order` char(1),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`question` varchar(255) NOT NULL,
	`image` varchar(255),
	`answerType` enum('MCQ','Grid in') NOT NULL,
	`difficulty` enum('A','B','C','D','E') NOT NULL,
	`questionType` enum('Trail','Extra') NOT NULL,
	`lesson_id` char(255) NOT NULL,
	`year` year NOT NULL,
	`month` enum('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec') NOT NULL,
	`section` enum('1','2','3','4') NOT NULL,
	`code_id` char(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_codes` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`code` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exam_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admins` ADD `type` enum('super_admin','admin') DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `admins` ADD `status` enum('active','inactive') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `category` ADD `parent_category_id` char(255);--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_semester_id_semesters_id_fk` FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `semesters` ADD CONSTRAINT `semesters_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_teachers` ADD CONSTRAINT `course_teachers_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_teachers` ADD CONSTRAINT `course_teachers_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_ideas` ADD CONSTRAINT `lesson_ideas_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_chapter_id_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parallel_questions` ADD CONSTRAINT `parallel_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parallel_questions` ADD CONSTRAINT `parallel_questions_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parallel_question_options` ADD CONSTRAINT `parallel_question_options_question_id_parallel_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `parallel_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_answers` ADD CONSTRAINT `question_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_code_id_exam_codes_id_fk` FOREIGN KEY (`code_id`) REFERENCES `exam_codes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category` ADD CONSTRAINT `category_parent_category_id_category_id_fk` FOREIGN KEY (`parent_category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admins` DROP COLUMN `nickname`;--> statement-breakpoint
ALTER TABLE `admins` DROP COLUMN `avatar`;