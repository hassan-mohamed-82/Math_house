CREATE TABLE `wallet` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`studentId` char(255) NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `student` MODIFY COLUMN `parent_phone` varchar(255);--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD `course_id` char(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `wallet` ADD CONSTRAINT `wallet_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_exam` ADD CONSTRAINT `diagnostic_exam_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;