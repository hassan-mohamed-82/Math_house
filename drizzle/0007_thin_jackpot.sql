CREATE TABLE `promoCodesCourses` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`courseId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesCourses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesPackages` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`packageId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promoCodesPackages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `promoCodes` DROP FOREIGN KEY `promoCodes_courseId_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodes` DROP FOREIGN KEY `promoCodes_packageId_packages_id_fk`;
--> statement-breakpoint
ALTER TABLE `promoCodesCourses` ADD CONSTRAINT `promoCodesCourses_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesCourses` ADD CONSTRAINT `promoCodesCourses_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesPackages` ADD CONSTRAINT `promoCodesPackages_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesPackages` ADD CONSTRAINT `promoCodesPackages_packageId_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodes` DROP COLUMN `courseId`;--> statement-breakpoint
ALTER TABLE `promoCodes` DROP COLUMN `packageId`;