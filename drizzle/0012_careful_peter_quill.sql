CREATE TABLE `promoCodesCurrency` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`currencyId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesCurrency_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`amount` int NOT NULL,
	`paymentMethodId` char(36) NOT NULL,
	`studentId` char(36),
	`parentId` char(255),
	`status` enum('pending','completed','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `payment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `walletTransaction` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`walletId` char(255) NOT NULL,
	`paymentId` char(255) NOT NULL,
	`amount` int NOT NULL,
	`type` enum('deposit','withdrawal') NOT NULL,
	`source` enum('Admin','Voucher','Student','Parent') NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `walletTransaction_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
ALTER TABLE `sessions` ADD `session_link` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `material_link` varchar(500);--> statement-breakpoint
ALTER TABLE `sessions` ADD `teacher_material_link` varchar(500);--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` ADD CONSTRAINT `promoCodesCurrency_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCurrency` ADD CONSTRAINT `promoCodesCurrency_currencyId_currency_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `currency`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_paymentMethodId_paymentMethod_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `paymentMethod`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_studentId_student_id_fk` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment` ADD CONSTRAINT `payment_parentId_parents_id_fk` FOREIGN KEY (`parentId`) REFERENCES `parents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransaction` ADD CONSTRAINT `walletTransaction_walletId_wallet_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallet`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransaction` ADD CONSTRAINT `walletTransaction_paymentId_payment_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drive_assets` ADD CONSTRAINT `drive_assets_folder_id_drive_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `drive_folders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drive_folders` ADD CONSTRAINT `drive_folders_parent_folder_id_drive_folders_id_fk` FOREIGN KEY (`parent_folder_id`) REFERENCES `drive_folders`(`id`) ON DELETE no action ON UPDATE no action;