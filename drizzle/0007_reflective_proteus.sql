ALTER TABLE `exam_attempts` MODIFY COLUMN `id` char(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `exam_attempts` MODIFY COLUMN `ended_at` timestamp DEFAULT NULL;