CREATE TABLE `rewatch` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watched_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`watched_at` integer NOT NULL,
	`via` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rewatch_by_time` ON `rewatch` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE INDEX `rewatch_of` ON `rewatch` (`watched_id`);