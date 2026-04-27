ALTER TABLE `diagnostic_exam_attempt` MODIFY COLUMN `id` char(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` MODIFY COLUMN `startedAt` datetime NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `diagnostic_exam_attempt` MODIFY COLUMN `endedAt` datetime;