CREATE TABLE `grade` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`category_id` char(36) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grade_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_grade_name_per_category` UNIQUE(`name`,`category_id`),
	CONSTRAINT `unique_grade_name_ar_per_category` UNIQUE(`name_ar`,`category_id`)
);
--> statement-breakpoint
ALTER TABLE `grade` ADD CONSTRAINT `grade_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;