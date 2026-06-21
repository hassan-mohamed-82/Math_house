ALTER TABLE `lesson_ideas` ADD `bunny_guid` varchar(255);--> statement-breakpoint
ALTER TABLE `lesson_ideas` MODIFY COLUMN `pdf` varchar(500);--> statement-breakpoint
ALTER TABLE `lesson_ideas` MODIFY COLUMN `video` varchar(500);
