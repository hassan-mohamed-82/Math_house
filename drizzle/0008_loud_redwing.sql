ALTER TABLE `exam_attempts` MODIFY COLUMN `started_at` datetime NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `exam_attempts` MODIFY COLUMN `ended_at` datetime;