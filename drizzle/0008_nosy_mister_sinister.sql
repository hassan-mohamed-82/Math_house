CREATE TABLE `paymentMethod` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`type` enum('Manual','Automatic') NOT NULL,
	`logo` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentMethod_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentMethodCurrency` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`paymentMethodId` char(36) NOT NULL,
	`currencyId` char(36) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentMethodCurrency_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` ADD CONSTRAINT `paymentMethodCurrency_paymentMethodId_paymentMethod_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `paymentMethod`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentMethodCurrency` ADD CONSTRAINT `paymentMethodCurrency_currencyId_currency_id_fk` FOREIGN KEY (`currencyId`) REFERENCES `currency`(`id`) ON DELETE no action ON UPDATE no action;