CREATE TABLE `promoCodes` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoName` varchar(255) NOT NULL,
	`code` varchar(255) NOT NULL,
	`discountAmount` int NOT NULL,
	`courseId` char(255) NOT NULL,
	`packageId` char(255) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`numberOfUsages` int NOT NULL DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promoCodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoCodesUsers` (
	`id` char(255) NOT NULL DEFAULT (uuid()),
	`promoCodeId` char(255) NOT NULL,
	`userId` char(255) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promoCodesUsers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `promoCodes` ADD CONSTRAINT `promoCodes_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodes` ADD CONSTRAINT `promoCodes_packageId_packages_id_fk` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesUsers` ADD CONSTRAINT `promoCodesUsers_promoCodeId_promoCodes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promoCodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promoCodesUsers` ADD CONSTRAINT `promoCodesUsers_userId_student_id_fk` FOREIGN KEY (`userId`) REFERENCES `student`(`id`) ON DELETE no action ON UPDATE no action;