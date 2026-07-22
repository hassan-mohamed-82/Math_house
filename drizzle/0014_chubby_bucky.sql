CREATE TABLE `session_groups` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`session_id` char(36) NOT NULL,
	`group_id` char(36) NOT NULL,
	CONSTRAINT `session_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesAllowedStudents` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`studentId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesAllowedStudents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesChapters` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`chapterId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesChapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesLessons` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`lessonId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesLessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` char(255) NOT NULL,
	`student_id` char(36) NOT NULL,
	`quiz_id` char(255) NOT NULL,
	`started_at` datetime NOT NULL DEFAULT (now()),
	`ended_at` datetime,
	`score` int,
	`is_passed` boolean,
	`status` enum('in_progress','completed','timed_out') NOT NULL DEFAULT 'in_progress',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_quiz_answers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`attempt_id` char(255) NOT NULL,
	`question_id` char(255) NOT NULL,
	`selected_option_id` char(255),
	`grid_in_answer` varchar(255),
	`is_correct` boolean NOT NULL DEFAULT false,
	`score` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_quiz_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sessions` RENAME COLUMN `type` TO `schedule_type`;--> statement-breakpoint
ALTER TABLE `sessions` RENAME COLUMN `group_id` TO `start_date`;--> statement-breakpoint
ALTER TABLE `admins` DROP FOREIGN KEY `admins_role_id_roles_id_fk`;
--> statement-breakpoint
ALTER TABLE `student` DROP FOREIGN KEY `student_category_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `student` DROP FOREIGN KEY `student_grade_grade_id_fk`;
--> statement-breakpoint
ALTER TABLE `teachers` DROP FOREIGN KEY `teachers_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `courses` DROP FOREIGN KEY `courses_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_semester_id_semesters_id_fk`;
--> statement-breakpoint
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_teacher_id_teachers_id_fk`;
--> statement-breakpoint
ALTER TABLE `semesters` DROP FOREIGN KEY `semesters_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `lesson_ideas` DROP FOREIGN KEY `lesson_ideas_lesson_id_lessons_id_fk`;
--> statement-breakpoint
ALTER TABLE `lessons` DROP FOREIGN KEY `lessons_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `lessons` DROP FOREIGN KEY `lessons_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `lessons` DROP FOREIGN KEY `lessons_chapter_id_chapters_id_fk`;
--> statement-breakpoint
ALTER TABLE `lessons` DROP FOREIGN KEY `lessons_teacher_id_teachers_id_fk`;
--> statement-breakpoint
ALTER TABLE `parallel_questions` DROP FOREIGN KEY `parallel_questions_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `parallel_questions` DROP FOREIGN KEY `parallel_questions_lesson_id_lessons_id_fk`;
--> statement-breakpoint
ALTER TABLE `parallel_question_options` DROP FOREIGN KEY `parallel_question_options_question_id_parallel_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `question_answers` DROP FOREIGN KEY `question_answers_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `question_options` DROP FOREIGN KEY `question_options_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `questions` DROP FOREIGN KEY `questions_lesson_id_lessons_id_fk`;
--> statement-breakpoint
ALTER TABLE `questions` DROP FOREIGN KEY `questions_section_id_sections_id_fk`;
--> statement-breakpoint
ALTER TABLE `questions` DROP FOREIGN KEY `questions_code_id_exam_codes_id_fk`;
--> statement-breakpoint
ALTER TABLE `quiz_questions` DROP FOREIGN KEY `quiz_questions_quiz_id_quizzes_id_fk`;
--> statement-breakpoint
ALTER TABLE `quiz_questions` DROP FOREIGN KEY `quiz_questions_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `quizzes` DROP FOREIGN KEY `quizzes_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `quizzes` DROP FOREIGN KEY `quizzes_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `quizzes` DROP FOREIGN KEY `quizzes_chapter_id_chapters_id_fk`;
--> statement-breakpoint
ALTER TABLE `quizzes` DROP FOREIGN KEY `quizzes_lesson_id_lessons_id_fk`;
--> statement-breakpoint
ALTER TABLE `raw_score` DROP FOREIGN KEY `raw_score_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam` DROP FOREIGN KEY `diagnostic_exam_raw_score_id_raw_score_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam` DROP FOREIGN KEY `diagnostic_exam_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam_questions` DROP FOREIGN KEY `diagnostic_exam_questions_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `adaptive_exam` DROP FOREIGN KEY `adaptive_exam_exam_id_exams_id_fk`;
--> statement-breakpoint
ALTER TABLE `exam_sections` DROP FOREIGN KEY `exam_sections_section_id_sections_id_fk`;
--> statement-breakpoint
ALTER TABLE `exam_sections` DROP FOREIGN KEY `exam_sections_exam_id_exams_id_fk`;
--> statement-breakpoint
ALTER TABLE `exams` DROP FOREIGN KEY `exams_raw_score_id_raw_score_id_fk`;
--> statement-breakpoint
ALTER TABLE `exams` DROP FOREIGN KEY `exams_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `exams` DROP FOREIGN KEY `exams_code_id_exam_codes_id_fk`;
--> statement-breakpoint
ALTER TABLE `section_questions` DROP FOREIGN KEY `section_questions_section_id_exam_sections_id_fk`;
--> statement-breakpoint
ALTER TABLE `section_questions` DROP FOREIGN KEY `section_questions_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_attendance` DROP FOREIGN KEY `session_attendance_session_id_sessions_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_attendance` DROP FOREIGN KEY `session_attendance_student_id_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_academic_info` DROP FOREIGN KEY `session_academic_info_session_id_sessions_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_academic_info` DROP FOREIGN KEY `session_academic_info_lesson_id_lessons_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_ratings` DROP FOREIGN KEY `session_ratings_session_id_sessions_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_ratings` DROP FOREIGN KEY `session_ratings_student_id_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_users` DROP FOREIGN KEY `session_users_session_id_sessions_id_fk`;
--> statement-breakpoint
ALTER TABLE `session_users` DROP FOREIGN KEY `session_users_student_id_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_group_id_groups_id_fk`;
--> statement-breakpoint
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_teacher_id_teachers_id_fk`;
--> statement-breakpoint
ALTER TABLE `group_students` DROP FOREIGN KEY `group_students_group_id_groups_id_fk`;
--> statement-breakpoint
ALTER TABLE `groups` DROP FOREIGN KEY `groups_teacher_id_teachers_id_fk`;
--> statement-breakpoint
ALTER TABLE `packages` DROP FOREIGN KEY `packages_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `packages` DROP FOREIGN KEY `packages_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `notification_parents` DROP FOREIGN KEY `notification_parents_notification_id_notifications_id_fk`;
--> statement-breakpoint
ALTER TABLE `notification_students` DROP FOREIGN KEY `notification_students_notification_id_notifications_id_fk`;
--> statement-breakpoint
ALTER TABLE `notification_teachers` DROP FOREIGN KEY `notification_teachers_notification_id_notifications_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesCourses` DROP FOREIGN KEY `promoCodesCourses_promoCodeId_promoCodes_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesCourses` DROP FOREIGN KEY `promoCodesCourses_courseId_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` DROP FOREIGN KEY `promoCodesCurrency_promoCodeId_promoCodes_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` DROP FOREIGN KEY `promoCodesCurrency_currencyId_currency_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesPackages` DROP FOREIGN KEY `promoCodesPackages_promoCodeId_promoCodes_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesPackages` DROP FOREIGN KEY `promoCodesPackages_packageId_packages_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesUsers` DROP FOREIGN KEY `promoCodesUsers_promoCodeId_promoCodes_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesUsers` DROP FOREIGN KEY `promoCodesUsers_userId_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` DROP FOREIGN KEY `paymentMethodCurrency_paymentMethodId_paymentMethod_id_fk`;
--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` DROP FOREIGN KEY `paymentMethodCurrency_currencyId_currency_id_fk`;
--> statement-breakpoint
ALTER TABLE `payment` DROP FOREIGN KEY `payment_paymentMethodId_paymentMethod_id_fk`;
--> statement-breakpoint
ALTER TABLE `payment` DROP FOREIGN KEY `payment_studentId_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `payment` DROP FOREIGN KEY `payment_parentId_parents_id_fk`;
--> statement-breakpoint
ALTER TABLE `payment` DROP FOREIGN KEY `payment_packageId_packages_id_fk`;
--> statement-breakpoint
ALTER TABLE `exam_attempts` DROP FOREIGN KEY `exam_attempts_student_id_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `exam_attempts` DROP FOREIGN KEY `exam_attempts_exam_id_exams_id_fk`;
--> statement-breakpoint
ALTER TABLE `student_answers` DROP FOREIGN KEY `student_answers_attempt_id_exam_attempts_id_fk`;
--> statement-breakpoint
ALTER TABLE `student_answers` DROP FOREIGN KEY `student_answers_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `student_answers` DROP FOREIGN KEY `student_answers_selected_option_id_question_options_id_fk`;
--> statement-breakpoint
ALTER TABLE `wallet` DROP FOREIGN KEY `wallet_studentId_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `walletTransaction` DROP FOREIGN KEY `walletTransaction_walletId_wallet_id_fk`;
--> statement-breakpoint
ALTER TABLE `walletTransaction` DROP FOREIGN KEY `walletTransaction_paymentId_payment_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` DROP FOREIGN KEY `diagnostic_exam_attempt_studentId_student_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` DROP FOREIGN KEY `diagnostic_exam_attempt_diagnosticExamId_diagnostic_exam_id_fk`;
--> statement-breakpoint
ALTER TABLE `enrolledItems` DROP FOREIGN KEY `enrolledItems_courseId_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `enrolledItems` DROP FOREIGN KEY `enrolledItems_semesterId_semesters_id_fk`;
--> statement-breakpoint
ALTER TABLE `enrolledItems` DROP FOREIGN KEY `enrolledItems_chapterId_chapters_id_fk`;
--> statement-breakpoint
ALTER TABLE `enrolledItems` DROP FOREIGN KEY `enrolledItems_lessonId_lessons_id_fk`;
--> statement-breakpoint
ALTER TABLE `enrolledItems` DROP FOREIGN KEY `enrolledItems_paymentId_payment_id_fk`;
--> statement-breakpoint
ALTER TABLE `enrolledItems` DROP FOREIGN KEY `enrolledItems_priceId_prices_id_fk`;
--> statement-breakpoint
ALTER TABLE `grade` DROP FOREIGN KEY `grade_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `grade` DROP FOREIGN KEY `grade_parent_category_id_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `lesson_ideas` MODIFY COLUMN `pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `lesson_ideas` MODIFY COLUMN `video` varchar(500);--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `questionType` enum('Trail','Extra','Parallel') NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `session_date` date;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `schedule_type` enum('once','repeat') NOT NULL DEFAULT 'once';--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `start_date` date;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `session_link` varchar(500);--> statement-breakpoint
ALTER TABLE `packages` MODIFY COLUMN `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `lesson_ideas` ADD `bunny_guid` varchar(255);--> statement-breakpoint
ALTER TABLE `question_answers` ADD `answer_image` varchar(255);--> statement-breakpoint
ALTER TABLE `question_answers` ADD `answer_text` text;--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD `calculators` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `exams` ADD `calculators` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `sessions` ADD `end_date` date;--> statement-breakpoint
ALTER TABLE `packages` ADD `has_answers` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `packages` ADD `answers_price` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `promoCodes` ADD `type` enum('generic','restricted') NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `includedAnswers` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `reason` char(255);--> statement-breakpoint
ALTER TABLE `payment` ADD `isDeleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payment` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `promoCodes` ADD CONSTRAINT `promoCodes_code_unique` UNIQUE(`code`);--> statement-breakpoint
ALTER TABLE `session_groups` ADD CONSTRAINT `session_groups_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_groups` ADD CONSTRAINT `session_groups_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesAllowedStudents` ADD CONSTRAINT `promoCodesAllowedStudents_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesAllowedStudents` ADD CONSTRAINT `promoCodesAllowedStudents_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesChapters` ADD CONSTRAINT `promoCodesChapters_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesChapters` ADD CONSTRAINT `promoCodesChapters_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesLessons` ADD CONSTRAINT `promoCodesLessons_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesLessons` ADD CONSTRAINT `promoCodesLessons_lessonId_lessons_id_fk` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_quiz_id_quizzes_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_quiz_answers` ADD CONSTRAINT `student_quiz_answers_attempt_id_quiz_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_quiz_answers` ADD CONSTRAINT `student_quiz_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_quiz_answers` ADD CONSTRAINT `student_quiz_answers_selected_option_id_question_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admins` ADD CONSTRAINT `admins_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_category_category_id_fk` FOREIGN KEY (`category`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_grade_grade_id_fk` FOREIGN KEY (`grade`) REFERENCES `grade`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_semester_id_semesters_id_fk` FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `semesters` ADD CONSTRAINT `semesters_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_ideas` ADD CONSTRAINT `lesson_ideas_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_chapter_id_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parallel_questions` ADD CONSTRAINT `parallel_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parallel_questions` ADD CONSTRAINT `parallel_questions_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parallel_question_options` ADD CONSTRAINT `parallel_question_options_question_id_parallel_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `parallel_questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_answers` ADD CONSTRAINT `question_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_code_id_exam_codes_id_fk` FOREIGN KEY (`code_id`) REFERENCES `exam_codes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_quiz_id_quizzes_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_chapter_id_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_score` ADD CONSTRAINT `raw_score_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD CONSTRAINT `diagnostic_exam_raw_score_id_raw_score_id_fk` FOREIGN KEY (`raw_score_id`) REFERENCES `raw_score`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD CONSTRAINT `diagnostic_exam_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_questions` ADD CONSTRAINT `diagnostic_exam_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adaptive_exam` ADD CONSTRAINT `adaptive_exam_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_sections` ADD CONSTRAINT `exam_sections_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_sections` ADD CONSTRAINT `exam_sections_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_raw_score_id_raw_score_id_fk` FOREIGN KEY (`raw_score_id`) REFERENCES `raw_score`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_code_id_exam_codes_id_fk` FOREIGN KEY (`code_id`) REFERENCES `exam_codes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `section_questions` ADD CONSTRAINT `section_questions_section_id_exam_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `exam_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `section_questions` ADD CONSTRAINT `section_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_attendance` ADD CONSTRAINT `session_attendance_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_academic_info` ADD CONSTRAINT `session_academic_info_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_academic_info` ADD CONSTRAINT `session_academic_info_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_ratings` ADD CONSTRAINT `session_ratings_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_ratings` ADD CONSTRAINT `session_ratings_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_users` ADD CONSTRAINT `session_users_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_users` ADD CONSTRAINT `session_users_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_students` ADD CONSTRAINT `group_students_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_parents` ADD CONSTRAINT `notification_parents_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_students` ADD CONSTRAINT `notification_students_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_teachers` ADD CONSTRAINT `notification_teachers_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCourses` ADD CONSTRAINT `promoCodesCourses_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCourses` ADD CONSTRAINT `promoCodesCourses_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` ADD CONSTRAINT `promoCodesCurrency_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` ADD CONSTRAINT `promoCodesCurrency_currencyId_currency_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `currency`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesPackages` ADD CONSTRAINT `promoCodesPackages_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesPackages` ADD CONSTRAINT `promoCodesPackages_packageId_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesUsers` ADD CONSTRAINT `promoCodesUsers_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesUsers` ADD CONSTRAINT `promoCodesUsers_userId_student_id_fk` FOREIGN KEY (`userId`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` ADD CONSTRAINT `paymentMethodCurrency_paymentMethodId_paymentMethod_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `paymentMethod`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` ADD CONSTRAINT `paymentMethodCurrency_currencyId_currency_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `currency`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_paymentMethodId_paymentMethod_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `paymentMethod`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_parentId_parents_id_fk` FOREIGN KEY (`parentId`) REFERENCES `parents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_packageId_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_student_id_student_id_fk` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_selected_option_id_question_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet` ADD CONSTRAINT `wallet_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransaction` ADD CONSTRAINT `walletTransaction_walletId_wallet_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallet`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransaction` ADD CONSTRAINT `walletTransaction_paymentId_payment_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` ADD CONSTRAINT `diagnostic_exam_attempt_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` ADD CONSTRAINT `diagnostic_exam_attempt_diagnosticExamId_diagnostic_exam_id_fk` FOREIGN KEY (`diagnosticExamId`) REFERENCES `diagnostic_exam`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_lessonId_lessons_id_fk` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_paymentId_payment_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_priceId_prices_id_fk` FOREIGN KEY (`priceId`) REFERENCES `prices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grade` ADD CONSTRAINT `grade_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grade` ADD CONSTRAINT `grade_parent_category_id_category_id_fk` FOREIGN KEY (`parent_category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `session_attendance_student_status_idx` ON `session_attendance` (`student_id`,`status`);--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `teacher_id`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `days`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `time_from`;--> statement-breakpoint
ALTER TABLE `groups` DROP COLUMN `time_to`;