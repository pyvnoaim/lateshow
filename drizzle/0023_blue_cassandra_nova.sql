CREATE TABLE `rewatch` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watched_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`watched_at` integer NOT NULL,
	`via` text,
	FOREIGN KEY (`watched_id`) REFERENCES `watched`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rewatch_by_time` ON `rewatch` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE INDEX `rewatch_of` ON `rewatch` (`watched_id`);--> statement-breakpoint
CREATE VIEW `plays` AS select "id", "user_id", "media_type", "tmdb_id", "season", "episode", "title", "poster_path", "minutes", "watched_at", "via", 0 as "rewatch" from "watched" union all select -"rewatch"."id" as "id", "rewatch"."user_id", "watched"."media_type", "watched"."tmdb_id", "watched"."season", "watched"."episode", "watched"."title", "watched"."poster_path", "watched"."minutes", "rewatch"."watched_at", "rewatch"."via", 1 as "rewatch" from "rewatch" inner join "watched" on "watched"."id" = "rewatch"."watched_id";