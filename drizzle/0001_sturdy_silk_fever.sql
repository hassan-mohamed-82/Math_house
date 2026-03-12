ALTER TABLE `diagnostic_exam_attempt_answers` DROP FOREIGN KEY `diagnostic_exam_attempt_answers_attempt_id_diagnostic_exam_attempt_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` DROP FOREIGN KEY `diagnostic_exam_attempt_answers_question_id_questions_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` DROP FOREIGN KEY `diagnostic_exam_attempt_answers_student_answer_id_question_options_id_fk`;
--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` ADD CONSTRAINT `diag_attempt_ans_attempt_fk` FOREIGN KEY (`attempt_id`) REFERENCES `diagnostic_exam_attempt`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` ADD CONSTRAINT `diag_attempt_ans_question_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt_answers` ADD CONSTRAINT `diag_attempt_ans_option_fk` FOREIGN KEY (`student_answer_id`) REFERENCES `question_options`(`id`) ON DELETE no action ON UPDATE no action;