CREATE TABLE `enrolledItems` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`studentId` char(255) NOT NULL,
	`courseId` char(255),
	`semesterId` char(255),
	`chapterId` char(255),
	`lessonId` char(255),
	`paymentId` char(255),
	`status` enum('active','pending','expired') DEFAULT 'active',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `enrolledItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `session_relational_type` enum('Explanation','Re-Explanation','Mistakes','Exam') DEFAULT 'Explanation';--> statement-breakpoint
ALTER TABLE `walletTransaction` MODIFY COLUMN `paymentId` char(255);--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_chapterId_chapters_id_fk` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_lessonId_lessons_id_fk` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_paymentId_payment_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE no action ON UPDATE no action;