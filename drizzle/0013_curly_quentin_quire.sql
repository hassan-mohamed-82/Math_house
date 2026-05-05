ALTER TABLE `enrolledItems` ADD `priceId` char(36);--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `enrolledItems` ADD CONSTRAINT `enrolledItems_priceId_prices_id_fk` FOREIGN KEY (`priceId`) REFERENCES `prices`(`id`) ON DELETE no action ON UPDATE no action;