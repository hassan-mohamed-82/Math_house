ALTER TABLE `prices` ADD `total_price_egp` decimal(10,2) GENERATED ALWAYS AS (price_egp - COALESCE(discount_egp, 0)) VIRTUAL;--> statement-breakpoint
ALTER TABLE `prices` ADD `total_price_usd` decimal(10,2) GENERATED ALWAYS AS (price_usd - COALESCE(discount_usd, 0)) VIRTUAL;--> statement-breakpoint
ALTER TABLE `courses` DROP COLUMN `duration`;--> statement-breakpoint
ALTER TABLE `courses` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `courses` DROP COLUMN `discount`;--> statement-breakpoint
ALTER TABLE `courses` DROP COLUMN `total_amount`;--> statement-breakpoint
ALTER TABLE `chapters` DROP COLUMN `duration`;--> statement-breakpoint
ALTER TABLE `chapters` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `chapters` DROP COLUMN `discount`;--> statement-breakpoint
ALTER TABLE `chapters` DROP COLUMN `total_amount`;--> statement-breakpoint
ALTER TABLE `lessons` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `lessons` DROP COLUMN `discount`;--> statement-breakpoint
ALTER TABLE `lessons` DROP COLUMN `total_amount`;