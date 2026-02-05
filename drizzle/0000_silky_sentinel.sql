CREATE TABLE `admins` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`nickname` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone_number` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`role_id` char(36),
	`avatar` varchar(500),
	`permissions` json DEFAULT ('[]'),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `admins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(100) NOT NULL,
	`permissions` json DEFAULT ('[]'),
	`status` enum('active','inactive') DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255) NOT NULL,
	`nickname` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`phone` varchar(255) NOT NULL,
	`category` char(36) NOT NULL,
	`grade` enum('1','2','3','4','5','6','7','8','9','10','11','12','13') NOT NULL,
	`parent_phone` varchar(255) NOT NULL,
	CONSTRAINT `student_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parents` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone_number` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `parents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	`image` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `category_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admins` ADD CONSTRAINT `admins_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_category_category_id_fk` FOREIGN KEY (`category`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;