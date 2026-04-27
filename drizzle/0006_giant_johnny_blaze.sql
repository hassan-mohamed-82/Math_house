ALTER TABLE `student` MODIFY COLUMN `id` char(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `student` MODIFY COLUMN `grade` char(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `wallet` MODIFY COLUMN `id` char(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `walletTransaction` MODIFY COLUMN `id` char(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_grade_grade_id_fk` FOREIGN KEY (`grade`) REFERENCES `grade`(`id`) ON DELETE no action ON UPDATE no action;