CREATE TABLE `admins` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`type` enum('super_admin','admin') NOT NULL DEFAULT 'admin',
	`phone_number` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`role_id` char(36),
	`permissions` json DEFAULT ('[]'),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `admins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(100) NOT NULL,
	`permissions` json DEFAULT ('[]'),
	`status` enum('active','inactive') DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255) NOT NULL,
	`nickname` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`phone` varchar(255) NOT NULL,
	`category` char(36) NOT NULL,
	`grade` enum('1','2','3','4','5','6','7','8','9','10','11','12','13') NOT NULL,
	`parent_phone` varchar(255),
	`is_verified` boolean NOT NULL DEFAULT false,
	`live_balance` int NOT NULL DEFAULT 0,
	`exam_balance` int NOT NULL DEFAULT 0,
	`question_balance` int NOT NULL DEFAULT 0,
	`avatar` varchar(255),
	CONSTRAINT `student_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parents` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone_number` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `parents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `category` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	`image` varchar(255),
	`parent_category_id` char(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `category_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`category_id` char(255) NOT NULL,
	`description` varchar(255),
	`image` varchar(255),
	`pre_requisition` varchar(255),
	`what_you_gain` varchar(255),
	`duration` varchar(255),
	`price` double NOT NULL,
	`discount` double DEFAULT 0,
	`total_amount` double GENERATED ALWAYS AS (price - COALESCE(discount, 0)) VIRTUAL,
	`is_have_semester` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`category_id` char(255) NOT NULL,
	`semester_id` char(255),
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
	`course_id` char(255) NOT NULL,
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
	`section_id` char(255) NOT NULL,
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
CREATE TABLE `quiz_questions` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`quiz_id` char(255) NOT NULL,
	`question_id` char(255) NOT NULL,
	`question_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`title` varchar(255) NOT NULL,
	`description` text,
	`duration_hours` int DEFAULT 0,
	`duration_minutes` int DEFAULT 0,
	`total_score` int DEFAULT 100,
	`pass_score` int DEFAULT 50,
	`quiz_order` int DEFAULT 0,
	`is_active` boolean DEFAULT false,
	`category_id` char(255),
	`course_id` char(255),
	`chapter_id` char(255),
	`lesson_id` char(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`course_id` char(255) NOT NULL,
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
CREATE TABLE `popups` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`image` text NOT NULL,
	`destination` enum('student','parent','teacher') NOT NULL,
	`start_date` datetime NOT NULL,
	`end_date` datetime NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `popups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_ratings` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`session_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `session_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_users` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`session_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `session_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`session_date` date NOT NULL,
	`time_from` time NOT NULL,
	`time_to` time NOT NULL,
	`category_id` char(36) NOT NULL,
	`course_id` char(36) NOT NULL,
	`lesson_id` char(36),
	`lesson_name` varchar(500),
	`type` enum('session','private','group') NOT NULL,
	`group_id` char(36),
	`teacher_id` char(255) NOT NULL,
	`session_link` varchar(500) NOT NULL,
	`material_link` varchar(500),
	`teacher_material_link` varchar(500),
	`session_relational_type` enum('Explanation','Re-Exeplanation','Mistakes','Exam') DEFAULT 'Explanation',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `group_students` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`group_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `group_students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`teacher_id` char(255) NOT NULL,
	`days` json NOT NULL,
	`time_from` time NOT NULL,
	`time_to` time NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`type` enum('exam','question','live') NOT NULL,
	`category_id` char(36) NOT NULL,
	`course_id` char(36) NOT NULL,
	`number` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`duration` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_parents` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`notification_id` char(36) NOT NULL,
	`parent_id` char(36) NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_parents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_students` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`notification_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_teachers` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`notification_id` char(36) NOT NULL,
	`teacher_id` char(36) NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_teachers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`material_link` varchar(500),
	`material_file` varchar(500),
	`date_time` datetime NOT NULL,
	`notification` text NOT NULL,
	`send_to_all` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodes` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoName` varchar(255) NOT NULL,
	`code` varchar(255) NOT NULL,
	`discountAmount` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`numberOfUsages` int NOT NULL DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promoCodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesCourses` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`courseId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesCourses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesCurrency` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`currencyId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesCurrency_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesPackages` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`packageId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesPackages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesUsers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`userId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promoCodesUsers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentMethod` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`type` enum('Manual','Automatic') NOT NULL,
	`logo` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentMethod_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentMethodCurrency` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`paymentMethodId` char(36) NOT NULL,
	`currencyId` char(36) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentMethodCurrency_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`amount` int NOT NULL,
	`paymentMethodId` char(36) NOT NULL,
	`studentId` char(36),
	`parentId` char(255),
	`status` enum('pending','completed','rejected') NOT NULL DEFAULT 'pending',
	`receiptImg` char(255),
	`source` enum('student','parent') NOT NULL,
	`purpose` enum('wallet_recharge','purchase') NOT NULL,
	`packageId` char(36),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `payment_id` PRIMARY KEY(`id`)
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
CREATE TABLE `wallet` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`studentId` char(255) NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `walletTransaction` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`walletId` char(255) NOT NULL,
	`paymentId` char(255) NOT NULL,
	`amount` int NOT NULL,
	`type` enum('deposit','withdrawal') NOT NULL,
	`source` enum('Admin','Voucher','Student','Parent') NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `walletTransaction_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnostic_exam_attempt` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`studentId` char(255) NOT NULL,
	`diagnosticExamId` char(255) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`is_completed` boolean NOT NULL DEFAULT false,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp NOT NULL,
	CONSTRAINT `diagnostic_exam_attempt_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnostic_exam_attempt_answers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`attempt_id` char(255) NOT NULL,
	`question_id` char(255) NOT NULL,
	`student_answer_id` char(255),
	`student_grid_in_answer` varchar(255),
	`is_correct` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diagnostic_exam_attempt_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drive_assets` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`title` varchar(255) NOT NULL,
	`type` enum('video','pdf','image','audio','document','other') NOT NULL DEFAULT 'video',
	`status` enum('uploading','uploaded','processing','ready','failed') NOT NULL DEFAULT 'uploading',
	`folder_id` char(255),
	`bunny_guid` varchar(255),
	`source_url` varchar(500),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `drive_assets_bunny_guid_unique` UNIQUE(`bunny_guid`)
);
--> statement-breakpoint
CREATE TABLE `drive_folders` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`parent_folder_id` char(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admins` ADD CONSTRAINT `admins_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_category_category_id_fk` FOREIGN KEY (`category`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category` ADD CONSTRAINT `category_parent_category_id_category_id_fk` FOREIGN KEY (`parent_category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_semester_id_semesters_id_fk` FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `semesters` ADD CONSTRAINT `semesters_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `questions` ADD CONSTRAINT `questions_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_code_id_exam_codes_id_fk` FOREIGN KEY (`code_id`) REFERENCES `exam_codes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_quiz_id_quizzes_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_chapter_id_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_score` ADD CONSTRAINT `raw_score_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD CONSTRAINT `diagnostic_exam_raw_score_id_raw_score_id_fk` FOREIGN KEY (`raw_score_id`) REFERENCES `raw_score`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD CONSTRAINT `diagnostic_exam_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `session_ratings` ADD CONSTRAINT `session_ratings_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_ratings` ADD CONSTRAINT `session_ratings_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_users` ADD CONSTRAINT `session_users_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_students` ADD CONSTRAINT `group_students_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groups` ADD CONSTRAINT `groups_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_parents` ADD CONSTRAINT `notification_parents_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_students` ADD CONSTRAINT `notification_students_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_teachers` ADD CONSTRAINT `notification_teachers_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCourses` ADD CONSTRAINT `promoCodesCourses_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCourses` ADD CONSTRAINT `promoCodesCourses_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` ADD CONSTRAINT `promoCodesCurrency_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` ADD CONSTRAINT `promoCodesCurrency_currencyId_currency_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `currency`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesPackages` ADD CONSTRAINT `promoCodesPackages_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesPackages` ADD CONSTRAINT `promoCodesPackages_packageId_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesUsers` ADD CONSTRAINT `promoCodesUsers_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesUsers` ADD CONSTRAINT `promoCodesUsers_userId_student_id_fk` FOREIGN KEY (`userId`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` ADD CONSTRAINT `paymentMethodCurrency_paymentMethodId_paymentMethod_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `paymentMethod`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` ADD CONSTRAINT `paymentMethodCurrency_currencyId_currency_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `currency`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_paymentMethodId_paymentMethod_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `paymentMethod`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_parentId_parents_id_fk` FOREIGN KEY (`parentId`) REFERENCES `parents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_packageId_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_selected_option_id_question_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet` ADD CONSTRAINT `wallet_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransaction` ADD CONSTRAINT `walletTransaction_walletId_wallet_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallet`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransaction` ADD CONSTRAINT `walletTransaction_paymentId_payment_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` ADD CONSTRAINT `diagnostic_exam_attempt_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` ADD CONSTRAINT `diagnostic_exam_attempt_diagnosticExamId_diagnostic_exam_id_fk` FOREIGN KEY (`diagnosticExamId`) REFERENCES `diagnostic_exam`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` ADD CONSTRAINT `diagnostic_exam_attempt_answers_attempt_id_diagnostic_exam_attempt_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `diagnostic_exam_attempt`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` ADD CONSTRAINT `diagnostic_exam_attempt_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` ADD CONSTRAINT `diagnostic_exam_attempt_answers_student_answer_id_question_options_id_fk` FOREIGN KEY (`student_answer_id`) REFERENCES `question_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drive_assets` ADD CONSTRAINT `drive_assets_folder_id_drive_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `drive_folders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drive_folders` ADD CONSTRAINT `drive_folders_parent_folder_id_drive_folders_id_fk` FOREIGN KEY (`parent_folder_id`) REFERENCES `drive_folders`(`id`) ON DELETE no action ON UPDATE no action;