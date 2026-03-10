CREATE TABLE `drive_assets` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`title` varchar(255) NOT NULL,
	`type` enum('video','pdf','image','audio','document','other') NOT NULL DEFAULT 'video',
	`status` enum('uploading','uploaded','processing','ready','failed') NOT NULL DEFAULT 'uploading',
	`folder_id` char(255),
	`bunny_guid` varchar(255),
	`source_url` varchar(500),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `drive_assets_bunny_guid_unique` UNIQUE(`bunny_guid`)
);
--> statement-breakpoint
CREATE TABLE `drive_folders` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`name` varchar(255) NOT NULL,
	`parent_folder_id` char(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `drive_assets` ADD CONSTRAINT `drive_assets_folder_id_drive_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `drive_folders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drive_folders` ADD CONSTRAINT `drive_folders_parent_folder_id_drive_folders_id_fk` FOREIGN KEY (`parent_folder_id`) REFERENCES `drive_folders`(`id`) ON DELETE no action ON UPDATE no action;