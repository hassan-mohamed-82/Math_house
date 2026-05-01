CREATE TABLE `prices` (
	`id` char(36) NOT NULL,
	`target_type` enum('course','chapter','lesson') NOT NULL,
	`target_id` char(36) NOT NULL,
	`duration_label` varchar(255) NOT NULL,
	`duration_days` int NOT NULL,
	`price_egp` decimal(10,2) NOT NULL,
	`price_usd` decimal(10,2) NOT NULL,
	`has_discount` boolean DEFAULT false,
	`discount_egp` decimal(10,2) DEFAULT '0.00',
	`discount_usd` decimal(10,2) DEFAULT '0.00',
	`is_default` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `courses` MODIFY COLUMN `price` double DEFAULT 0;--> statement-breakpoint
ALTER TABLE `courses` MODIFY COLUMN `price` double;