CREATE TABLE `group_students` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`group_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `group_students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`teacher_id` char(255) NOT NULL,
	`days` json NOT NULL,
	`time_from` time NOT NULL,
	`time_to` time NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`type` enum('exam','question','live') NOT NULL,
	`category_id` char(36) NOT NULL,
	`course_id` char(36) NOT NULL,
	`number` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`duration` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_parents` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`notification_id` char(36) NOT NULL,
	`parent_id` char(36) NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_parents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_students` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`notification_id` char(36) NOT NULL,
	`student_id` char(36) NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_teachers` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`notification_id` char(36) NOT NULL,
	`teacher_id` char(36) NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_teachers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`material_link` varchar(500),
	`material_file` varchar(500),
	`date_time` datetime NOT NULL,
	`notification` text NOT NULL,
	`send_to_all` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `group_students` ADD CONSTRAINT `group_students_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groups` ADD CONSTRAINT `groups_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_parents` ADD CONSTRAINT `notification_parents_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_students` ADD CONSTRAINT `notification_students_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_teachers` ADD CONSTRAINT `notification_teachers_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE no action ON UPDATE no action;