CREATE TABLE `import_batch` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `import_batch_by_user` ON `import_batch` (`user_id`);--> statement-breakpoint
ALTER TABLE `rating` ADD `import_id` text;--> statement-breakpoint
ALTER TABLE `watched` ADD `import_id` text;--> statement-breakpoint
CREATE INDEX `watched_by_import` ON `watched` (`import_id`);--> statement-breakpoint
ALTER TABLE `watchlist` ADD `import_id` text;