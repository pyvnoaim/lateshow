CREATE TABLE `watched` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`season` integer DEFAULT 0 NOT NULL,
	`episode` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`minutes` integer DEFAULT 0 NOT NULL,
	`watched_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watched_once` ON `watched` (`user_id`,`media_type`,`tmdb_id`,`season`,`episode`);--> statement-breakpoint
CREATE INDEX `watched_by_time` ON `watched` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE TABLE `watchlist` (
	`user_id` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`added_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `media_type`, `tmdb_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
